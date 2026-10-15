const crypto = require('crypto');
const { supabaseFetch } = require('../_lib/supabase');
const { sendToAffiliate } = require('../_lib/push');

function json(res, status, body) { return res.status(status).json(body); }

let cachedPublicKeys = [];
let cachedPublicKeysAt = 0;
const PUBLIC_KEYS_TTL_MS = 60 * 60 * 1000;

async function getWooviPublicKeys() {
  const now = Date.now();
  if (cachedPublicKeys.length && now - cachedPublicKeysAt < PUBLIC_KEYS_TTL_MS) {
    return cachedPublicKeys;
  }

  const response = await fetch('https://api.woovi.com/api/v1/webhook/public-keys', {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    if (cachedPublicKeys.length) return cachedPublicKeys;
    throw new Error(`Não foi possível obter as chaves públicas da Woovi (HTTP ${response.status}).`);
  }
  const body = await response.json();
  const keys = Array.isArray(body.public_keys)
    ? body.public_keys.map(item => String(item?.key || '').trim()).filter(Boolean)
    : [];
  if (!keys.length) {
    if (cachedPublicKeys.length) return cachedPublicKeys;
    throw new Error('A Woovi não retornou chaves públicas para validar a assinatura.');
  }
  cachedPublicKeys = keys;
  cachedPublicKeysAt = now;
  return cachedPublicKeys;
}

async function verifyWooviSignature(rawBody, signature) {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || !signature) return false;
  const keys = await getWooviPublicKeys();
  for (const publicKey of keys) {
    try {
      const verifier = crypto.createVerify('RSA-SHA256');
      verifier.update(rawBody);
      verifier.end();
      if (verifier.verify(publicKey, String(signature), 'base64')) return true;
    } catch (error) {
      // Ignore a malformed/rotated key and try the other published keys.
    }
  }
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const payload = req.body || {};

    // Woovi sends a test payload when a webhook is registered in the dashboard.
    // Acknowledge that handshake without touching the database; otherwise the
    // endpoint would reject the registration before real payment events can arrive.
    const testMarker = String(payload.evento || payload.event || payload.type || '').trim().toLowerCase();
    if (testMarker === 'teste_webhook' || testMarker === 'test_webhook' || testMarker === 'webhook_test') {
      return json(res, 200, { received: true, test: true });
    }

    // Real events are authenticated using Woovi's official RSA-SHA256 signature
    // over the exact raw request bytes. This avoids requiring an extra custom
    // header that is not automatically sent by the webhook configuration.
    const signature = req.headers?.['x-webhook-signature'];
    const validSignature = await verifyWooviSignature(req.rawBody, signature);
    if (!validSignature) return json(res, 401, { error: 'Assinatura do webhook Woovi inválida ou ausente.' });

    const event = String(payload.event || payload.name || '').trim();
    const payment = payload.payment || payload.data?.payment || {};
    const charge = payload.charge || payload.data?.charge || {};
    const movement = payload.movement || payload.data?.movement || {};
    const transaction = payload.transaction || payload.data?.transaction || {};
    const correlationID = String(
      payment.correlationID || charge.correlationID || movement.correlationID || transaction.correlationID ||
      payload.correlationID || payload.correlationId || ''
    ).trim();
    const paymentId = String(payment.id || charge.identifier || charge.id || movement.paymentId || payload.paymentId || '').trim();
    const eventId = String(payload.id || payload.eventId || payload.webhookId || '').trim() ||
      crypto.createHash('sha256').update(req.rawBody).digest('hex');

    const inserted = await supabaseFetch('/rest/v1/woovi_webhook_events', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({
        woovi_event_id: eventId,
        event_type: event,
        correlation_id: correlationID || null,
        payment_id: paymentId || null,
        payload,
      }),
    });
    if (!Array.isArray(inserted) || inserted.length === 0) return json(res, 200, { received: true, duplicate: true });

    // Incoming freight charge for affiliate benefit-store product purchases.
    // Only a signed, authenticated Woovi CHARGE_COMPLETED event can mark freight as paid.
    if (event === 'OPENPIX:CHARGE_COMPLETED' || event === 'OPENPIX:CHARGE_CONFIRMED') {
      if (!correlationID) return json(res, 200, { received: true, ignored: true, reason: 'missing charge correlation' });
      const purchases = await supabaseFetch(`/rest/v1/affiliate_product_purchases?freight_correlation_id=eq.${encodeURIComponent(correlationID)}&select=id,affiliate_id,freight_paid,freight_amount&limit=1`);
      const purchase = purchases?.[0];
      if (!purchase) return json(res, 200, { received: true, unmatched: true });
      if (purchase.freight_paid === true) return json(res, 200, { received: true, alreadyPaid: true });
      const updated = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${Number(purchase.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ freight_paid: true, freight_paid_at: new Date().toISOString(), freight_charge_id: paymentId || null, updated_at: new Date().toISOString() }),
      });
      if (updated?.[0]) {
        try { await sendToAffiliate(purchase.affiliate_id, { title: 'Frete confirmado!', body: `O pagamento do frete da sua solicitação ${purchase.id} foi confirmado. A She já pode preparar o envio.`, url: '/afiliado', tag: `product-freight-${purchase.id}` }); } catch {}
      }
      return json(res, 200, { received: true, freightPaid: true, purchaseId: Number(purchase.id) });
    }

    let status = null;
    if (event === 'OPENPIX:MOVEMENT_CONFIRMED') status = 'paid';
    else if (event === 'OPENPIX:MOVEMENT_FAILED') status = 'failed';
    else if (event === 'OPENPIX:MOVEMENT_REMOVED') status = 'cancelled';
    if (!status) return json(res, 200, { received: true, ignored: true });

    let rows = [];
    if (correlationID) {
      rows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?woovi_correlation_id=eq.${encodeURIComponent(correlationID)}&select=id,status,affiliate_id,amount,woovi_correlation_id,woovi_payment_id,woovi_status,affiliates(id,name,email)&limit=1`);
    }
    if (!rows?.[0] && paymentId) {
      rows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?woovi_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,status,affiliate_id,amount,woovi_correlation_id,woovi_payment_id,woovi_status,affiliates(id,name,email)&limit=1`);
    }
    if (!rows?.[0]) return json(res, 200, { received: true, unmatched: true });
    const withdrawal = rows[0];
    if (withdrawal.status === 'paid') return json(res, 200, { received: true, alreadyPaid: true });

    const finalStatus = status === 'cancelled' ? 'cancelled' : status;
    const endToEndId = String(transaction.endToEndId || movement.endToEndId || payload.endToEndId || '').trim() || null;
    const updatedRows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(withdrawal.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: finalStatus,
        woovi_status: event,
        woovi_end_to_end_id: endToEndId,
        woovi_fail_reason: finalStatus === 'failed' ? String(movement.reason || payload.reason || 'Pagamento Pix falhou na Woovi').slice(0, 1000) : null,
        processed_at: new Date().toISOString(),
      }),
    });

    const updated = updatedRows?.[0];
    if (updated && finalStatus === 'paid') {
      try {
        console.log('[She Push Withdrawal] start', JSON.stringify({ withdrawalId: Number(withdrawal.id), affiliateId: Number(withdrawal.affiliate_id), status: finalStatus }));
        const pushResult = await sendToAffiliate(withdrawal.affiliate_id, {
          title: 'Saque realizado!',
          body: `Seu saque de R$ ${Number(withdrawal.amount || 0).toFixed(2).replace('.', ',')} foi realizado com sucesso.`,
          url: '/afiliado',
          tag: `withdrawal-${withdrawal.id}-paid`,
        });
        console.log('[She Push Withdrawal] result', JSON.stringify({ withdrawalId: Number(withdrawal.id), affiliateId: Number(withdrawal.affiliate_id), result: pushResult || null }));
      } catch (pushError) {
        console.error('[She Push Withdrawal] failed', JSON.stringify({ withdrawalId: Number(withdrawal.id), affiliateId: Number(withdrawal.affiliate_id), statusCode: pushError.statusCode || null, message: pushError.message || 'sem detalhes' }));
      }
    }
    if (updated && withdrawal.affiliates?.email && ['paid', 'failed'].includes(finalStatus)) {
      const { sendEmail, affiliateWithdrawalApprovedEmail } = require('../_lib/email');
      const label = finalStatus === 'paid' ? 'foi pago' : 'falhou';
      await sendEmail({
        to: withdrawal.affiliates.email,
        subject: `Saque ${label} — She Afiliadas`,
        html: affiliateWithdrawalApprovedEmail({
          name: withdrawal.affiliates.name,
          amount: withdrawal.amount,
          status: finalStatus === 'paid' ? 'paid' : 'failed',
        }),
        tags: [{ name: 'category', value: 'withdrawal-status' }],
      }).catch(() => null);
    }
    return json(res, 200, { received: true, status: finalStatus });
  } catch (error) {
    console.error('[Woovi Webhook]', error);
    return json(res, 503, { error: 'Não foi possível validar/processar o webhook da Woovi com segurança.' });
  }
};

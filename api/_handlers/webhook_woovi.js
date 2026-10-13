const crypto = require('crypto');
const { supabaseFetch } = require('../_lib/supabase');

function json(res, status, body) { return res.status(status).json(body); }

function safeEqual(a, b) {
  if (a === undefined || a === null || b === undefined || b === null) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

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

  // Shared random token is an additional layer; URL query tokens are deliberately
  // not accepted to avoid exposing the secret in access logs.
  const expectedToken = String(process.env.WOOVI_WEBHOOK_TOKEN || '').trim();
  if (!expectedToken) return json(res, 500, { error: 'WOOVI_WEBHOOK_TOKEN não configurado.' });
  const receivedToken = req.headers?.['x-she-webhook-token'];
  if (!safeEqual(receivedToken, expectedToken)) return json(res, 401, { error: 'Não autorizado.' });

  try {
    // Verify the official Woovi RSA-SHA256 signature over the exact raw bytes
    // before trusting any payload field or writing to Supabase.
    const signature = req.headers?.['x-webhook-signature'];
    const validSignature = await verifyWooviSignature(req.rawBody, signature);
    if (!validSignature) return json(res, 401, { error: 'Assinatura do webhook Woovi inválida ou ausente.' });

    const payload = req.body || {};
    const event = String(payload.event || payload.name || '').trim();
    const payment = payload.payment || payload.data?.payment || {};
    const movement = payload.movement || payload.data?.movement || {};
    const transaction = payload.transaction || payload.data?.transaction || {};
    const correlationID = String(
      payment.correlationID || movement.correlationID || transaction.correlationID ||
      payload.correlationID || payload.correlationId || ''
    ).trim();
    const paymentId = String(payment.id || movement.paymentId || payload.paymentId || '').trim();
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

const crypto = require('crypto');
const { supabaseFetch } = require('../_lib/supabase');

function json(res, status, body) { res.status(status).json(body); }

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  // A URL do webhook deve conter ?token=... usando um segredo longo configurado no Vercel.
  // A Woovi também assina seus webhooks; quando o corpo bruto está disponível, validamos a assinatura.
  const expectedToken = String(process.env.WOOVI_WEBHOOK_TOKEN || '').trim();
  if (!expectedToken) return json(res, 500, { error: 'WOOVI_WEBHOOK_TOKEN não configurado.' });
  const url = new URL(req.url, `https://${req.headers?.host || 'localhost'}`);
  const receivedToken = url.searchParams.get('token') || req.headers['x-she-webhook-token'];
  if (!safeEqual(receivedToken, expectedToken)) return json(res, 401, { error: 'Não autorizado.' });

  try {
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
      crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

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
    return json(res, 500, { error: 'Erro ao processar webhook da Woovi.' });
  }
};

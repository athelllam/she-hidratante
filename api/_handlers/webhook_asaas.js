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

  const expectedToken = String(process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
  if (!expectedToken) return json(res, 500, { error: 'ASAAS_WEBHOOK_TOKEN não configurado.' });

  const receivedToken = req.headers['asaas-access-token'];
  if (!safeEqual(receivedToken, expectedToken)) {
    return json(res, 401, { error: 'Não autorizado.' });
  }

  try {
    const payload = req.body || {};
    const eventId = String(payload.id || '').trim();
    const event = String(payload.event || '').trim();
    const transferId = String(payload.transfer?.id || '').trim();

    if (!eventId) return json(res, 200, { received: true });

    // Webhooks do Asaas são "at least once": o mesmo evento pode chegar mais de uma vez.
    const inserted = await supabaseFetch('/rest/v1/asaas_webhook_events', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify({
        asaas_event_id: eventId,
        event_type: event,
        transfer_id: transferId || null,
        payload,
      }),
    });

    if (!Array.isArray(inserted) || inserted.length === 0) {
      return json(res, 200, { received: true, duplicate: true });
    }

    if (!transferId) return json(res, 200, { received: true });

    const transfer = payload.transfer || {};
    const transferStatus = String(transfer.status || '').toUpperCase();

    let status = null;
    if (event === 'TRANSFER_DONE' || transferStatus === 'DONE') status = 'paid';
    else if (event === 'TRANSFER_FAILED' || transferStatus === 'FAILED') status = 'failed';
    else if (event === 'TRANSFER_CANCELLED' || transferStatus === 'CANCELLED') status = 'cancelled';
    else if (['TRANSFER_PENDING', 'TRANSFER_IN_BANK_PROCESSING', 'TRANSFER_BLOCKED'].includes(event)) status = 'processing';

    if (!status) return json(res, 200, { received: true });

    const rows = await supabaseFetch(
      `/rest/v1/affiliate_withdrawals?asaas_transfer_id=eq.${encodeURIComponent(transferId)}&select=id,status,amount,affiliate_id,asaas_transfer_id,asaas_status,asaas_fail_reason,transaction_receipt_url,affiliates(id,name,email)&limit=1`
    );

    if (!rows?.[0]) return json(res, 200, { received: true, unmatched: true });

    const withdrawal = rows[0];

    // Não retrocede uma operação já concluída.
    if (withdrawal.status === 'paid') return json(res, 200, { received: true });

    await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(withdrawal.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        status,
        asaas_status: transferStatus || event,
        asaas_fail_reason: transfer.failReason || null,
        transaction_receipt_url: transfer.transactionReceiptUrl || null,
        processed_at: status === 'paid' || status === 'failed' || status === 'cancelled' ? new Date().toISOString() : null,
      }),
    });

    return json(res, 200, { received: true });
  } catch (error) {
    console.error('[Asaas Webhook]', error);
    return json(res, 500, { error: 'Erro ao processar webhook.' });
  }
};

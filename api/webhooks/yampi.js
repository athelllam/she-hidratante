const { supabaseFetch, json } = require('../_lib/supabase');
const crypto = require('crypto');

function header(req, name) {
  return req.headers[name.toLowerCase()] || req.headers[name] || '';
}

function getOrder(payload) {
  return payload?.data?.order || payload?.order || payload?.data || payload;
}

function metadataEntries(order) {
  const candidates = [
    order?.metadata?.data,
    order?.metadata,
    order?.transactions?.data?.metadata?.data,
    order?.transactions?.data?.metadata,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (candidate && typeof candidate === 'object') {
      return Object.entries(candidate).map(([key, value]) => ({ key, value }));
    }
  }

  return [];
}

function getMetadata(payload, key = 'affiliate_id') {
  const order = getOrder(payload);
  const wanted = String(key).toLowerCase();
  const item = metadataEntries(order).find(
    entry => String(entry?.key || '').toLowerCase() === wanted
  );
  return item?.value ?? null;
}

function getOrderId(payload) {
  const order = getOrder(payload);
  return order?.id ?? order?.number ?? order?.order_id ?? order?.code ?? null;
}

function normalizeStatus(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

function getStatus(payload) {
  const order = getOrder(payload);
  return normalizeStatus(
    order?.status?.data?.alias ||
    order?.status?.data?.slug ||
    order?.status?.data?.name ||
    order?.status?.alias ||
    order?.status?.slug ||
    order?.status?.name ||
    order?.status ||
    order?.transactions?.data?.status?.alias ||
    order?.transactions?.data?.status?.slug ||
    order?.transactions?.data?.status?.name ||
    order?.transactions?.data?.status ||
    payload?.event ||
    ''
  );
}

function isPaymentApproved(payload) {
  const event = normalizeStatus(payload?.event);
  const order = getOrder(payload);
  const status = getStatus(payload);
  const transaction = order?.transactions?.data ?? order?.transactions ?? null;
  const transactionStatus = normalizeStatus(
    transaction?.status?.alias ||
    transaction?.status?.slug ||
    transaction?.status?.name ||
    transaction?.status ||
    ''
  );

  return (
    event === 'order.paid' ||
    event === 'payment.approved' ||
    event === 'payment_approved' ||
    status === 'payment_approved' ||
    status === 'pagamento_aprovado' ||
    status === 'paid' ||
    status === 'approved' ||
    status === 'aprovado' ||
    transactionStatus === 'payment_approved' ||
    transactionStatus === 'pagamento_aprovado' ||
    transactionStatus === 'paid' ||
    transactionStatus === 'approved' ||
    transactionStatus === 'aprovado' ||
    Boolean(transaction && transaction.captured === true && transaction.cancelled !== true)
  );
}

function getStoredStatus(payload) {
  return isPaymentApproved(payload) ? 'payment_approved' : (getStatus(payload) || 'created');
}

function getTotal(payload) {
  const order = getOrder(payload);
  return Number(
    order?.value_total ??
    order?.total ??
    order?.amount ??
    order?.value ??
    order?.payment?.total ??
    order?.transactions?.data?.amount ??
    0
  ) || 0;
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const secret = process.env.YAMPI_WEBHOOK_SECRET;
    if (secret) {
      const received = header(req, 'x-yampi-webhook-secret') || header(req, 'x-webhook-secret') || header(req, 'x-yampi-signature');
      if (!safeEqual(received, secret)) return json(res, 401, { error: 'Webhook não autorizado.' });
    }

    const payload = req.body || {};
    const affiliateId = Number(getMetadata(payload, 'affiliate_id'));
    const yampiOrderId = String(getOrderId(payload) || '');

    if (!affiliateId || !yampiOrderId) {
      return json(res, 200, { ok: true, ignored: true, reason: 'Sem affiliate_id ou order id.' });
    }

    if (!isPaymentApproved(payload)) {
      return json(res, 200, { ok: true, ignored: true, reason: 'Evento/status não representa pagamento aprovado.' });
    }

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}&select=id,commission_rate&limit=1`);
    if (!affiliates?.[0]) {
      return json(res, 200, { ok: true, ignored: true, reason: 'Afiliada inexistente.' });
    }

    const status = getStoredStatus(payload);
    const total = getTotal(payload);
    const commission = total * Number(affiliates[0].commission_rate || 0);

    await supabaseFetch(`/rest/v1/affiliate_orders?on_conflict=yampi_order_id`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        yampi_order_id: yampiOrderId,
        affiliate_id: affiliateId,
        status,
        total,
        commission,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      }),
    });

    return json(res, 200, { ok: true, orderId: yampiOrderId, affiliateId, status });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no webhook.' });
  }
};

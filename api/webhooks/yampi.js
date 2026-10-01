const { supabaseFetch, json } = require('../_lib/supabase');
const crypto = require('crypto');

function header(req, name) {
  return req.headers[name.toLowerCase()] || req.headers[name] || '';
}

function getMetadata(payload) {
  const candidates = [
    payload?.data?.order,
    payload?.order,
    payload?.data,
    payload,
  ];
  for (const obj of candidates) {
    const metadata = obj?.metadata;
    if (!metadata) continue;
    if (metadata.affiliate_id != null) return metadata.affiliate_id;
    if (metadata.afiliado != null) return metadata.afiliado;
    if (metadata['affiliate_id'] != null) return metadata['affiliate_id'];
  }
  return null;
}

function getOrder(payload) {
  return payload?.data?.order || payload?.order || payload?.data || payload;
}

function getStatus(payload) {
  const order = getOrder(payload);
  return String(
    order?.status?.slug ||
    order?.status?.name ||
    order?.status ||
    payload?.event ||
    ''
  ).toLowerCase().replace(/\s+/g, '_');
}

function getTotal(payload) {
  const order = getOrder(payload);
  return Number(
    order?.value_total ??
    order?.total ??
    order?.amount ??
    order?.value ??
    order?.payment?.total ??
    0
  );
}

function getOrderId(payload) {
  const order = getOrder(payload);
  return order?.id ?? order?.number ?? order?.order_id ?? order?.code ?? null;
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
    const affiliateId = Number(getMetadata(payload));
    const yampiOrderId = String(getOrderId(payload) || '');
    if (!affiliateId || !yampiOrderId) return json(res, 200, { ok: true, ignored: true, reason: 'Sem affiliate_id ou order id.' });

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}&select=id,commission_rate&limit=1`);
    if (!affiliates?.[0]) return json(res, 200, { ok: true, ignored: true, reason: 'Afiliada inexistente.' });

    const status = getStatus(payload) || 'created';
    if (status !== 'payment_approved') {
      return json(res, 200, { ok: true, ignored: true, reason: 'Status não é payment_approved.' });
    }
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

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no webhook.' });
  }
};

const crypto = require('crypto');
const { supabaseFetch, json } = require('../_lib/supabase');

function safeEqual(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function getSignature(req) {
  const headers = req.headers || {};
  return String(headers['x-me-signature'] || headers['X-ME-Signature'] || '').trim();
}

function verifySignature(req) {
  // Melhor Envio signs the exact request body with HMAC-SHA256 and the app secret.
  const secret = String(process.env.MELHOR_ENVIO_WEBHOOK_SECRET || process.env.MELHOR_ENVIO_CLIENT_SECRET || '').trim();
  const rawBody = req.rawBody;
  const signature = getSignature(req).replace(/^sha256=/i, '');
  if (!secret || !signature || !rawBody || !Buffer.isBuffer(rawBody)) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest();
  return safeEqual(signature, digest.toString('base64')) || safeEqual(signature, digest.toString('hex'));
}

function trackingCodeFrom(value, depth = 0) {
  if (value == null || depth > 8) return '';
  if (typeof value === 'string') {
    const match = value.toUpperCase().match(/\b[A-Z]{2}\d{9}[A-Z]{2}\b/);
    return match ? match[0] : '';
  }
  if (Array.isArray(value)) {
    for (const item of value) { const found = trackingCodeFrom(item, depth + 1); if (found) return found; }
    return '';
  }
  if (typeof value === 'object') {
    const keys = ['tracking', 'tracking_code', 'tracking_number', 'trackingcode', 'codigo_rastreio', 'codigo_rastreamento', 'self_tracking'];
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const found = trackingCodeFrom(value[key], depth + 1);
        if (found) return found;
      }
    }
    for (const item of Object.values(value)) { const found = trackingCodeFrom(item, depth + 1); if (found) return found; }
  }
  return '';
}

function purchaseIdFromTags(tags) {
  if (!Array.isArray(tags)) return null;
  for (const item of tags) {
    const tag = String(item?.tag || item || '').trim();
    const match = tag.match(/^SHE-AF-(\d+)$/i);
    if (match) return Number(match[1]);
  }
  return null;
}

async function findPurchase(data) {
  const purchaseId = purchaseIdFromTags(data?.tags);
  if (purchaseId) {
    const byTag = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${purchaseId}&select=id,melhor_envio_shipment_id,tracking_url,melhor_envio_tracking_code&limit=1`);
    if (byTag?.[0]) return byTag[0];
  }

  const ids = [data?.id, data?.order_id, data?.orderId].filter(v => v != null && String(v).trim()).map(v => String(v).trim());
  for (const id of [...new Set(ids)]) {
    // IDs returned by /me/cart are stored on the purchase. Encode the ID before using it in a PostgREST filter.
    const encoded = encodeURIComponent(id);
    const rows = await supabaseFetch(`/rest/v1/affiliate_product_purchases?melhor_envio_shipment_id=eq.${encoded}&select=id,melhor_envio_shipment_id,tracking_url,melhor_envio_tracking_code&limit=1`);
    if (rows?.[0]) return rows[0];
  }
  return null;
}

module.exports = async function webhookMelhorEnvio(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  if (!verifySignature(req)) {
    console.warn('[Melhor Envio webhook] Assinatura inválida ou corpo bruto indisponível.');
    return json(res, 401, { error: 'Assinatura do webhook do Melhor Envio inválida.' });
  }

  try {
    const payload = req.body && typeof req.body === 'object' ? req.body : null;
    if (!payload || typeof payload !== 'object') return json(res, 400, { error: 'Payload JSON inválido.' });
    const event = String(payload.event || '').trim();
    const data = payload.data && typeof payload.data === 'object' ? payload.data : {};
    const rawTracking = typeof data.tracking === 'string' && /^[A-Z0-9]{8,30}$/i.test(data.tracking.trim())
      ? data.tracking.trim().toUpperCase()
      : '';
    const code = trackingCodeFrom(data.tracking) || trackingCodeFrom(data.self_tracking) || rawTracking || trackingCodeFrom(data);
    const suppliedUrl = String(data.tracking_url || data.trackingUrl || '').trim();
    const trackingUrl = /^https?:\/\//i.test(suppliedUrl)
      ? suppliedUrl
      : (code ? `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(code)}` : '');

    const purchase = await findPurchase(data);
    if (!purchase) {
      // Acknowledge valid events for unrelated/unmapped labels to avoid pointless retries.
      console.info('[Melhor Envio webhook] Evento válido sem solicitação correspondente.', {
        event, hasId: Boolean(data.id), hasTags: Array.isArray(data.tags) && data.tags.length > 0, hasTracking: Boolean(code || suppliedUrl)
      });
      return json(res, 200, { ok: true, matched: false });
    }

    const patch = { updated_at: new Date().toISOString() };
    if (code) patch.melhor_envio_tracking_code = code;
    if (trackingUrl) patch.tracking_url = trackingUrl;
    // A webhook may arrive before carrier tracking becomes available. Acknowledge it;
    // a later order.posted/order.updated event can populate the tracking fields.
    if (code || trackingUrl) {
      await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${Number(purchase.id)}`, {
        method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch)
      });
    }
    console.info('[Melhor Envio webhook] Evento processado.', {
      event, purchaseId: Number(purchase.id), hasTrackingCode: Boolean(code), hasTrackingUrl: Boolean(trackingUrl)
    });
    return json(res, 200, { ok: true, matched: true, trackingUpdated: Boolean(code || trackingUrl) });
  } catch (error) {
    console.error('[Melhor Envio webhook] Falha ao processar evento.', { message: String(error?.message || 'erro').slice(0, 180) });
    return json(res, 500, { error: 'Não foi possível processar o webhook do Melhor Envio.' });
  }
};

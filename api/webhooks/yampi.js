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
    order?.status?.alias ||
    order?.status?.data?.slug ||
    order?.status?.data?.alias ||
    order?.status?.name ||
    order?.status?.data?.name ||
    order?.status ||
    payload?.event ||
    ''
  ).toLowerCase().trim().replace(/\s+/g, '_');
}

function getStatusDiagnostics(payload) {
  const order = getOrder(payload);
  return {
    event: payload?.event ?? null,
    orderId: order?.id ?? order?.number ?? order?.order_id ?? order?.code ?? null,
    status: {
      raw: order?.status ?? null,
      slug: order?.status?.slug ?? null,
      alias: order?.status?.alias ?? null,
      dataSlug: order?.status?.data?.slug ?? null,
      dataAlias: order?.status?.data?.alias ?? null,
      name: order?.status?.name ?? null,
      dataName: order?.status?.data?.name ?? null,
      normalized: getStatus(payload) || null,
    },
    metadata: {
      orderMetadata: order?.metadata ?? null,
      payloadMetadata: payload?.metadata ?? null,
      affiliateId: getMetadata(payload),
    },
    keys: {
      payload: Object.keys(payload || {}),
      data: Object.keys(payload?.data || {}),
      order: Object.keys(order || {}),
    },
  };
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
    const diagnostics = getStatusDiagnostics(payload);

    // DIAGNÓSTICO TEMPORÁRIO:
    // Não registra PII nem o payload inteiro. O objetivo é descobrir exatamente
    // qual status/alias a Yampi envia e onde o metadata[affiliate_id] aparece.
    console.log('[YAMPI WEBHOOK DIAGNOSTIC]', JSON.stringify(diagnostics));

    const affiliateId = Number(getMetadata(payload));
    const yampiOrderId = String(getOrderId(payload) || '');
    if (!affiliateId || !yampiOrderId) {
      console.log('[YAMPI WEBHOOK DIAGNOSTIC] Ignorado por identificação:', JSON.stringify({
        affiliateId: getMetadata(payload),
        orderId: diagnostics.orderId,
        event: diagnostics.event,
        normalizedStatus: diagnostics.status.normalized,
      }));
      return json(res, 200, { ok: true, ignored: true, reason: 'Sem affiliate_id ou order id.' });
    }

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}&select=id,commission_rate&limit=1`);
    if (!affiliates?.[0]) return json(res, 200, { ok: true, ignored: true, reason: 'Afiliada inexistente.' });

    const status = getStatus(payload) || 'created';
    if (status !== 'payment_approved') {
      console.log('[YAMPI WEBHOOK DIAGNOSTIC] STATUS NÃO CONFIRMADO:', JSON.stringify({
        event: diagnostics.event,
        orderId: diagnostics.orderId,
        normalizedStatus: status,
        statusObject: diagnostics.status,
        affiliateId: diagnostics.metadata.affiliateId,
      }));
      return json(res, 200, {
        ok: true,
        ignored: true,
        reason: 'Status não é payment_approved.',
        diagnostic: {
          event: diagnostics.event,
          orderId: diagnostics.orderId,
          normalizedStatus: status,
          affiliateId: diagnostics.metadata.affiliateId,
        },
      });
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

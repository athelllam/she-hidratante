const { supabaseFetch, json } = require('../_lib/supabase');
const crypto = require('crypto');
const { reconcileAffiliateOrderCommissions, normalizeConfig, DEFAULT_COMMISSION_CONFIG } = require('../_lib/affiliateCommission');

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

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}&select=id,team_joined_at&limit=1`);
    if (!affiliates?.[0]) {
      return json(res, 200, { ok: true, ignored: true, reason: 'Afiliada inexistente.' });
    }

    const status = getStoredStatus(payload);
    const total = getTotal(payload);

    const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales&limit=1');
    const row = settingRows?.[0];
    const commissionConfig = normalizeConfig(row ? {
      ticketThreshold: row.ticket_threshold,
      ticketBonus: row.ticket_bonus,
      teamCommissionPerSale: row.team_commission_per_sale,
      commissions: { none: row.commission_none, bronze: row.commission_bronze, silver: row.commission_silver, gold: row.commission_gold },
      monthlyLevels: { bronze: row.monthly_bronze_sales, silver: row.monthly_silver_sales, gold: row.monthly_gold_sales },
      fixedLevels: { bronze: row.fixed_bronze_sales, silver: row.fixed_silver_sales, gold: row.fixed_gold_sales },
    } : DEFAULT_COMMISSION_CONFIG);

    const existingRows = await supabaseFetch(
      `/rest/v1/affiliate_orders?yampi_order_id=eq.${encodeURIComponent(yampiOrderId)}&select=id,status&limit=1`
    );
    const previousStatus = existingRows?.[0]?.status || null;

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
        commission: 0,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      }),
    });

    const reconciliation = await reconcileAffiliateOrderCommissions(
      supabaseFetch,
      affiliateId,
      commissionConfig,
      { teamJoinedAt: affiliates[0].team_joined_at }
    );

    return json(res, 200, { ok: true, orderId: yampiOrderId, affiliateId, status, commissionReconciled: reconciliation.updated || 0 });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no webhook.' });
  }
};

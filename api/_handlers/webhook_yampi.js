const { supabaseFetch, json } = require('../_lib/supabase');
const crypto = require('crypto');
const { reconcileAffiliateOrderCommissions, reconcileTeamMonthlyCommissions, normalizeConfig, DEFAULT_COMMISSION_CONFIG } = require('../_lib/affiliateCommission');
const { getCreatedAt, yampiFetch } = require('../_lib/yampi');
const { sendToAffiliate } = require('../_lib/push');

function header(req, name) {
  return req.headers[name.toLowerCase()] || req.headers[name] || '';
}

function getOrder(payload) {
  // A Yampi pode enviar o pedido inteiro, um envelope `data.order`,
  // ou somente os dados do recurso alterado.
  const candidates = [
    payload?.data?.order,
    payload?.order,
    payload?.data?.data?.order,
    payload?.data?.resource,
    payload?.resource?.data,
    payload?.resource,
    payload?.data,
    payload?.payload?.data?.order,
    payload?.payload?.order,
    payload?.payload?.data,
    payload?.payload,
    payload,
  ];
  return candidates.find(value => value && typeof value === 'object' && !Array.isArray(value)) || {};
}

function getFirstValue(...values) {
  return values.find(value => value !== undefined && value !== null && String(value).trim() !== '') ?? null;
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
  return getFirstValue(
    order?.id, order?.order_id, order?.orderId, order?.number, order?.code,
    payload?.data?.order_id, payload?.data?.orderId, payload?.data?.id,
    payload?.data?.resource_id, payload?.resource_id, payload?.resourceId,
    payload?.order_id, payload?.orderId, payload?.id,
    payload?.payload?.data?.id, payload?.payload?.data?.resource_id,
    payload?.payload?.order_id, payload?.payload?.id
  );
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

    let payload = req.body || {};
    let yampiOrderId = String(getOrderId(payload) || '');
    let affiliateId = Number(getMetadata(payload, 'affiliate_id'));

    // A Yampi pode enviar um webhook enxuto, sem metadata ou transação completa.
    // Nesse caso, consulta o pedido oficial antes de ignorar o evento.
    console.log('[She Yampi Webhook] received', JSON.stringify({
      event: payload?.event || payload?.type || null,
      orderId: yampiOrderId || null,
      affiliateId: affiliateId || null,
      status: getStatus(payload) || null,
      keys: payload && typeof payload === 'object' ? Object.keys(payload).slice(0, 30) : [],
      dataKeys: payload?.data && typeof payload.data === 'object' ? Object.keys(payload.data).slice(0, 30) : [],
      resource: payload?.resource || payload?.data?.resource || null,
    }));

    if (yampiOrderId && (!affiliateId || !isPaymentApproved(payload))) {
      try {
        const fetched = await yampiFetch(`/orders/${encodeURIComponent(yampiOrderId)}?include=metadata,transactions`);
        const fetchedOrder = fetched?.data?.order || fetched?.data || fetched?.order || fetched;
        if (fetchedOrder && typeof fetchedOrder === 'object') {
          // Mantém o evento original e usa o pedido consultado para campos ausentes.
          const originalOrder = getOrder(payload) || {};
          // Os dados completos da API são a fonte de verdade para status,
          // metadata e transações. Campos do evento só preenchem lacunas.
          const mergedOrder = { ...originalOrder, ...fetchedOrder };
          payload = { ...payload, data: { ...(payload.data && typeof payload.data === 'object' ? payload.data : {}), order: mergedOrder } };
          yampiOrderId = String(getOrderId(payload) || yampiOrderId);
          affiliateId = Number(getMetadata(payload, 'affiliate_id'));
          console.log('[She Yampi Webhook] order enriched', JSON.stringify({ orderId: yampiOrderId, affiliateId: affiliateId || null, status: getStatus(payload) || null, approved: isPaymentApproved(payload) }));
        }
      } catch (lookupError) {
        console.error('[She Yampi Webhook] order lookup failed', JSON.stringify({ orderId: yampiOrderId || null, statusCode: lookupError.statusCode || null, message: lookupError.message || 'sem detalhes' }));
      }
    }

    if (!affiliateId || !yampiOrderId) {
      console.warn('[She Yampi Webhook] ignored missing affiliate/order', JSON.stringify({ event: payload?.event || payload?.type || null, orderId: yampiOrderId || null, affiliateId: affiliateId || null }));
      return json(res, 200, { ok: true, ignored: true, reason: 'Sem affiliate_id ou order id.' });
    }

    if (!isPaymentApproved(payload)) {
      console.log('[She Yampi Webhook] ignored not approved', JSON.stringify({ orderId: yampiOrderId, affiliateId, event: payload?.event || payload?.type || null, status: getStatus(payload) || null }));
      return json(res, 200, { ok: true, ignored: true, reason: 'Evento/status não representa pagamento aprovado.' });
    }

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}&select=id,team_joined_at,team_parent_id&limit=1`);
    if (!affiliates?.[0]) {
      return json(res, 200, { ok: true, ignored: true, reason: 'Afiliada inexistente.' });
    }

    const status = getStoredStatus(payload);
    const total = getTotal(payload);
    // Use the actual order creation timestamp from Yampi, not the webhook
    // arrival time, so month boundaries and historical commission are correct.
    const saleCreatedAt = getCreatedAt(getOrder(payload));

    const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,team_advanced1_members,team_advanced1_sales,team_advanced1_commission,team_advanced2_members,team_advanced2_sales,team_advanced2_commission,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales&limit=1');
    const row = settingRows?.[0];
    const commissionConfig = normalizeConfig(row ? {
      ticketThreshold: row.ticket_threshold,
      ticketBonus: row.ticket_bonus,
      teamCommissionPerSale: row.team_commission_per_sale,
      teamAdvanced1: { members: row.team_advanced1_members, sales: row.team_advanced1_sales, commissionPerSale: row.team_advanced1_commission },
      teamAdvanced2: { members: row.team_advanced2_members, sales: row.team_advanced2_sales, commissionPerSale: row.team_advanced2_commission },
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
        ...(saleCreatedAt ? { created_at: saleCreatedAt } : {}),
        commission: 0,
        team_commission_snapshot: affiliates[0].team_parent_id ? Number(commissionConfig.teamCommissionPerSale || 0) : 0,
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

    // Se a venda pertence a uma equipe, recalcula retroativamente o valor de
    // todas as vendas elegíveis do mês corrente para a líder dessa equipe.
    const parentId = Number(affiliates[0].team_parent_id || 0);
    if (parentId > 0) {
      const [members, teamOrders] = await Promise.all([
        supabaseFetch(`/rest/v1/affiliates?team_parent_id=eq.${parentId}&select=id&limit=1000`),
        supabaseFetch(`/rest/v1/affiliate_orders?select=id,affiliate_id,status,team_commission_snapshot,created_at&order=created_at.asc&limit=20000`),
      ]);
      const memberIds = new Set((members || []).map(member => Number(member.id)));
      await reconcileTeamMonthlyCommissions(supabaseFetch, parentId, members || [], (teamOrders || []).filter(order => memberIds.has(Number(order.affiliate_id))), commissionConfig).catch(() => null);
    }

    const wasAlreadyApproved = ['payment_approved', 'pagamento_aprovado', 'paid', 'approved', 'aprovado'].includes(String(previousStatus || '').toLowerCase());
    const pushDiagnostics = { skipped: wasAlreadyApproved, personal: null };

    console.log('[She Push Sale] webhook accepted', JSON.stringify({
      orderId: yampiOrderId,
      affiliateId,
      parentId,
      status,
      previousStatus,
      wasAlreadyApproved,
    }));

    // O webhook pode chegar depois de a sincronização já ter gravado a venda
    // como aprovada no Supabase. Nesse caso, ainda precisamos disparar o push;
    // a sincronização manual continua evitando reenvios para pedidos já aprovados.
    // O mesmo tag por pedido ajuda o navegador a substituir notificações repetidas.
    {
      try {
        pushDiagnostics.personal = await sendToAffiliate(affiliateId, {
          title: 'Venda realizada!',
          body: 'Uma venda foi aprovada e sua comissão foi atualizada. 💗',
          url: '/afiliado',
          tag: `sale-${yampiOrderId}`,
        });
        console.log('[She Push Sale] personal result', JSON.stringify({ orderId: yampiOrderId, affiliateId, result: pushDiagnostics.personal }));
      } catch (pushError) {
        pushDiagnostics.personal = { error: pushError.message || 'Falha sem detalhes', statusCode: pushError.statusCode || null };
        console.error('[She Push Sale] personal failed', JSON.stringify({ orderId: yampiOrderId, affiliateId, ...pushDiagnostics.personal }));
      }

    }

    return json(res, 200, {
      ok: true,
      orderId: yampiOrderId,
      affiliateId,
      status,
      commissionReconciled: reconciliation.updated || 0,
      pushDiagnostics,
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no webhook.' });
  }
};

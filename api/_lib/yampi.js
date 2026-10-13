const { supabaseFetch } = require('./supabase');
const { reconcileAffiliateOrderCommissions, normalizeConfig, DEFAULT_COMMISSION_CONFIG } = require('./affiliateCommission');
const { sendToAffiliate } = require('./push');

const YAMPI_BASE_URL = 'https://api.dooki.com.br/v2';

function getConfig() {
  const alias = String(process.env.YAMPI_ALIAS || '').trim();
  const token = String(process.env.YAMPI_USER_TOKEN || '').trim();
  const secret = String(process.env.YAMPI_USER_SECRET_KEY || '').trim();

  return {
    alias,
    token,
    secret,
    configured: Boolean(token && secret),
    syncDays: Math.max(1, Number(process.env.YAMPI_SYNC_DAYS || 365)),
    maxOrders: Math.max(100, Number(process.env.YAMPI_SYNC_MAX_ORDERS || 2000)),
  };
}

async function resolveAlias(config) {
  if (config.alias) return config.alias;

  const response = await fetch(`${YAMPI_BASE_URL}/auth/me`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'User-Token': config.token,
      'User-Secret-Key': config.secret,
    },
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.error || data?.msg || `Yampi auth HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.data = data;
    throw error;
  }

  const merchants = data?.data?.merchants?.data || data?.merchants?.data || [];
  const merchant = merchants.find(item => item?.active !== false) || merchants[0];
  const alias = String(merchant?.alias || '').trim();
  if (!alias) {
    const error = new Error('Não foi possível descobrir o alias da loja Yampi.');
    error.statusCode = 502;
    throw error;
  }
  return alias;
}

async function yampiFetch(path, options = {}) {
  const config = getConfig();
  if (!config.configured) {
    const error = new Error('Integração Yampi não configurada.');
    error.code = 'YAMPI_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }

  const alias = await resolveAlias(config);
  const response = await fetch(`${YAMPI_BASE_URL}/${alias}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'User-Token': config.token,
      'User-Secret-Key': config.secret,
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const error = new Error(
      data?.message || data?.error || data?.msg || `Yampi HTTP ${response.status}`
    );
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
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

function getMetadata(order, key) {
  const wanted = String(key).toLowerCase();
  const item = metadataEntries(order).find(
    entry => String(entry?.key || '').toLowerCase() === wanted
  );
  return item?.value ?? null;
}

function getOrderId(order) {
  return order?.id ?? order?.number ?? order?.order_id ?? order?.code ?? null;
}

function getStatus(order) {
  return String(
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
  ).toLowerCase().trim().replace(/\s+/g, '_');
}

function isPaymentApprovedStatus(status) {
  return new Set([
    'payment_approved',
    'pagamento_aprovado',
    'paid',
    'approved',
    'aprovado',
  ]).has(String(status || '').toLowerCase());
}

function getTransaction(order) {
  const value = order?.transactions?.data ?? order?.transactions ?? null;
  if (Array.isArray(value)) return value[0] || null;
  return value && typeof value === 'object' ? value : null;
}

function isPaymentApprovedOrder(order) {
  // O status do pedido muda depois do pagamento (separação, faturado,
  // transporte etc.). A transação é a fonte correta para saber se houve
  // pagamento aprovado.
  const transaction = getTransaction(order);
  const transactionStatus = String(
    transaction?.status?.alias ||
    transaction?.status?.slug ||
    transaction?.status?.name ||
    transaction?.status ||
    ''
  ).toLowerCase().trim().replace(/\s+/g, '_');

  if (isPaymentApprovedStatus(transactionStatus)) return true;
  if (transaction && transaction.captured === true && transaction.cancelled !== true) return true;

  // Compatibilidade com payloads em que a transação não veio no include.
  return isPaymentApprovedStatus(getStatus(order));
}

function getTotal(order) {
  return Number(
    order?.value_total ??
    order?.total ??
    order?.amount ??
    order?.transactions?.data?.amount ??
    0
  ) || 0;
}

function getCreatedAt(order) {
  const raw = order?.created_at?.date || order?.created_at || order?.transactions?.data?.created_at?.date;
  if (!raw) return null;
  const normalized = String(raw).replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isCancelledStatus(status) {
  return new Set([
    'cancelled',
    'canceled',
    'refunded',
    'chargeback',
    'payment_refunded',
    'payment_denied',
    'payment_failed',
  ]).has(String(status || '').toLowerCase());
}


async function loadCurrentCommissionConfig() {
  const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=*&limit=1');
  const row = rows?.[0];
  if (!row) return DEFAULT_COMMISSION_CONFIG;
  return normalizeConfig({
    ticketThreshold: row.ticket_threshold,
    ticketBonus: row.ticket_bonus,
    teamCommissionPerSale: row.team_commission_per_sale,
    commissions: {
      none: row.commission_none,
      bronze: row.commission_bronze,
      silver: row.commission_silver,
      gold: row.commission_gold,
    },
    monthlyLevels: {
      bronze: row.monthly_bronze_sales,
      silver: row.monthly_silver_sales,
      gold: row.monthly_gold_sales,
    },
    fixedLevels: {
      bronze: row.fixed_bronze_sales,
      silver: row.fixed_silver_sales,
      gold: row.fixed_gold_sales,
    },
  });
}

async function upsertAffiliateOrder(order, affiliateId, commissionRate) {
  const yampiOrderId = String(getOrderId(order) || '');
  if (!yampiOrderId) return false;

  const status = isPaymentApprovedOrder(order) ? 'payment_approved' : (getStatus(order) || 'created');
  const total = getTotal(order);
  const commission = 0;
  const createdAt = getCreatedAt(order);

  const existingRows = await supabaseFetch(
    `/rest/v1/affiliate_orders?yampi_order_id=eq.${encodeURIComponent(yampiOrderId)}&select=id,status&limit=1`
  );
  const previousStatus = existingRows?.[0]?.status || null;

  await supabaseFetch('/rest/v1/affiliate_orders?on_conflict=yampi_order_id', {
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
      raw_payload: order,
      ...(createdAt ? { created_at: createdAt } : {}),
      updated_at: new Date().toISOString(),
    }),
  });

  return {
    synced: true,
    orderId: yampiOrderId,
    previousStatus,
    wasAlreadyApproved: ['payment_approved', 'pagamento_aprovado', 'paid', 'approved', 'aprovado'].includes(String(previousStatus || '').toLowerCase()),
  };
}

async function syncAffiliateOrders(affiliateId = null, commissionRate) {
  const config = getConfig();
  if (!config.configured) {
    return { configured: false, synced: 0, scanned: 0, message: 'Integração Yampi não configurada.' };
  }

  const cutoff = new Date(Date.now() - config.syncDays * 24 * 60 * 60 * 1000);
  let scrollId = '';
  let scanned = 0;
  let synced = 0;
  let pages = 0;
  const affectedAffiliateIds = new Set();

  while (scanned < config.maxOrders) {
    const params = new URLSearchParams({ scroll: 'true', limit: '100', include: 'metadata,transactions' });
    if (scrollId) params.set('scroll_id', scrollId);

    const response = await yampiFetch(`/orders?${params.toString()}`);
    const orders = asArray(response);
    pages += 1;
    if (!orders.length) break;

    scrollId = String(response?.scroll_id || response?.meta?.scroll_id || '');

    for (const order of orders) {
      if (scanned >= config.maxOrders) break;
      scanned += 1;

      const createdAt = getCreatedAt(order);
      if (createdAt && new Date(createdAt) < cutoff) {
        // A listagem da Yampi é usada em ordem estável com scroll; quando
        // chegamos ao corte, não precisamos percorrer o histórico inteiro.
        scrollId = '';
        break;
      }

      const status = getStatus(order);
      if (!isPaymentApprovedOrder(order)) continue;

      const metadataId = Number(getMetadata(order, 'affiliate_id'));
      if (!metadataId || (affiliateId != null && metadataId !== Number(affiliateId))) continue;
      const targetAffiliateId = metadataId;
      affectedAffiliateIds.add(targetAffiliateId);

      const syncResult = await upsertAffiliateOrder(order, targetAffiliateId, commissionRate);
      if (syncResult?.synced) {
        synced += 1;
        if (!syncResult.wasAlreadyApproved) {
          try {
            console.log('[She Push Sale] sync start', JSON.stringify({ orderId: syncResult.orderId, affiliateId: targetAffiliateId }));
            const pushResult = await sendToAffiliate(targetAffiliateId, {
              title: 'Venda realizada!',
              body: 'Uma venda foi aprovada e sua comissão foi atualizada. 💗',
              url: '/afiliado',
              tag: `sale-${syncResult.orderId}`,
            });
            console.log('[She Push Sale] sync result', JSON.stringify({ orderId: syncResult.orderId, affiliateId: targetAffiliateId, result: pushResult || null }));
          } catch (pushError) {
            console.error('[She Push Sale] sync failed', JSON.stringify({
              orderId: syncResult.orderId,
              affiliateId: targetAffiliateId,
              statusCode: pushError.statusCode || null,
              message: pushError.message || 'sem detalhes',
            }));
          }
        } else {
          console.log('[She Push Sale] sync skipped already approved', JSON.stringify({ orderId: syncResult.orderId, affiliateId: targetAffiliateId, previousStatus: syncResult.previousStatus }));
        }
      }
    }

    if (!scrollId) break;
  }

  let commissionReconciled = 0;
  try {
    const commissionConfig = await loadCurrentCommissionConfig();
    const idsToReconcile = affiliateId != null ? [Number(affiliateId)] : [...affectedAffiliateIds];
    for (const targetId of idsToReconcile) {
      try {
        const affiliateRows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${targetId}&select=team_joined_at&limit=1`);
        const reconciliation = await reconcileAffiliateOrderCommissions(
          supabaseFetch,
          targetId,
          commissionConfig,
          { teamJoinedAt: affiliateRows?.[0]?.team_joined_at }
        );
        commissionReconciled += Number(reconciliation?.updated || 0);
      } catch (error) {
        console.error('[She Commission] Falha ao reconciliar após sincronização Yampi:', JSON.stringify({ affiliateId: targetId, message: error.message || 'sem detalhes' }));
      }
    }
  } catch (error) {
    console.error('[She Commission] Falha ao carregar configuração para sincronização Yampi:', error);
  }

  return {
    configured: true,
    synced,
    scanned,
    pages,
    cutoff: cutoff.toISOString(),
    partial: scanned >= config.maxOrders,
    commissionReconciled,
  };
}

module.exports = {
  getConfig,
  yampiFetch,
  getMetadata,
  getOrderId,
  getStatus,
  isPaymentApprovedStatus,
  isPaymentApprovedOrder,
  getTotal,
  getCreatedAt,
  syncAffiliateOrders,
};

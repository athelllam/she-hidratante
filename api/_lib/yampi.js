const { supabaseFetch } = require('./supabase');
const { DEFAULT_COMMISSION_CONFIG, normalizeConfig, getLevel, levelIndex, monthKey, isPaidOrder } = require('./affiliateCommission');

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
  return new Set(['payment_approved', 'pagamento_aprovado', 'paid']).has(String(status || '').toLowerCase());
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

async function upsertAffiliateOrder(order, affiliateId, commissionRate) {
  const yampiOrderId = String(getOrderId(order) || '');
  if (!yampiOrderId) return { ok: false, existed: false };

  const existing = await supabaseFetch(`/rest/v1/affiliate_orders?yampi_order_id=eq.${encodeURIComponent(yampiOrderId)}&select=id,commission_rate_locked,commission_level_key,team_commission_locked&limit=1`);
  const existed = Boolean(existing?.[0]);

  const status = getStatus(order) || 'created';
  const total = getTotal(order);
  const commission = isCancelledStatus(status) ? 0 : total * Number(commissionRate || 0);
  const createdAt = getCreatedAt(order);

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

  return true;
}


async function getAffiliateCommissionSettings() {
  const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold&limit=1');
  const row = rows?.[0];
  return normalizeConfig(row ? {
    ticketThreshold: row.ticket_threshold,
    ticketBonus: row.ticket_bonus,
    teamCommissionPerSale: row.team_commission_per_sale,
    commissions: { none: row.commission_none, bronze: row.commission_bronze, silver: row.commission_silver, gold: row.commission_gold },
  } : DEFAULT_COMMISSION_CONFIG);
}

async function lockCommissionForPaidOrder(affiliateId, yampiOrderId, settingsInput = null, isNewOrder = false) {
  const settings = settingsInput || await getAffiliateCommissionSettings();
  const orders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${Number(affiliateId)}&status=in.(payment_approved,paid,pagamento_aprovado)&select=id,yampi_order_id,status,total,created_at,commission_rate_locked,commission_level_key,team_commission_locked&order=created_at.asc&limit=5000`);
  const current = (orders || []).find(order => String(order.yampi_order_id) === String(yampiOrderId));
  if (!current || !isPaidOrder(current)) return;

  const currentMonth = monthKey(current.created_at);
  if (!currentMonth) return;
  const monthOrders = (orders || []).filter(order => isPaidOrder(order) && monthKey(order.created_at) === currentMonth);
  const sales = monthOrders.length;
  const currentLevel = getLevel(sales, settings);
  const previousLevel = getLevel(Math.max(0, sales - 1), settings);
  const upgraded = levelIndex(currentLevel.key) > levelIndex(previousLevel.key);
  const newRate = Number(currentLevel.commissionPerOrder || 0);

  if (upgraded) {
    // The moment the affiliate reaches a new level, every paid order in that
    // month is retroactively recalculated using the NEW level's rate.
    await Promise.all(monthOrders.map(order =>
      supabaseFetch(`/rest/v1/affiliate_orders?id=eq.${Number(order.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ commission_rate_locked: newRate, commission_level_key: currentLevel.key }),
      })
    ));
  } else if (isNewOrder && !Number.isFinite(Number(current.commission_rate_locked))) {
    // Admin setting changes affect only future sales while the affiliate stays
    // at the same level. Historical orders retain their locked rate.
    await supabaseFetch(`/rest/v1/affiliate_orders?id=eq.${Number(current.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ commission_rate_locked: newRate, commission_level_key: currentLevel.key }),
    });
  }

  // Team commission is also frozen at the moment the child's sale is paid.
  if (isNewOrder && !Number.isFinite(Number(current.team_commission_locked))) {
    await supabaseFetch(`/rest/v1/affiliate_orders?id=eq.${Number(current.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ team_commission_locked: Number(settings.teamCommissionPerSale || 0) }),
    });
  }
}

async function syncAffiliateOrders(affiliateId, commissionRate) {
  const config = getConfig();
  if (!config.configured) {
    return { configured: false, synced: 0, scanned: 0, message: 'Integração Yampi não configurada.' };
  }

  const cutoff = new Date(Date.now() - config.syncDays * 24 * 60 * 60 * 1000);
  let scrollId = '';
  let scanned = 0;
  let synced = 0;
  let pages = 0;

  while (scanned < config.maxOrders) {
    const params = new URLSearchParams({ scroll: 'true', limit: '100', include: 'metadata' });
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
        return { configured: true, synced, scanned, pages, cutoff: cutoff.toISOString() };
      }

      const status = getStatus(order);
      if (!isPaymentApprovedStatus(status)) continue;

      const metadataId = Number(getMetadata(order, 'affiliate_id'));
      if (!metadataId || metadataId !== Number(affiliateId)) continue;

      const upserted = await upsertAffiliateOrder(order, affiliateId, commissionRate);
      if (upserted.ok) {
        synced += 1;
        await lockCommissionForPaidOrder(affiliateId, getOrderId(order), undefined, !upserted.existed);
      }
    }

    if (!scrollId) break;
  }

  return {
    configured: true,
    synced,
    scanned,
    pages,
    cutoff: cutoff.toISOString(),
    partial: scanned >= config.maxOrders,
  };
}

module.exports = {
  getConfig,
  yampiFetch,
  getMetadata,
  getOrderId,
  getStatus,
  isPaymentApprovedStatus,
  getTotal,
  getCreatedAt,
  syncAffiliateOrders,
  lockCommissionForPaidOrder,
};

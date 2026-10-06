const DEFAULT_COMMISSION_CONFIG = {
  ticketThreshold: 170,
  ticketBonus: 5,
  teamCommissionPerSale: 10,
  commissions: {
    none: 30,
    bronze: 40,
    silver: 50,
    gold: 60,
  },
  monthlyLevels: { bronze: 10, silver: 50, gold: 101 },
  fixedLevels: { bronze: 100, silver: 300, gold: 500 },
};

const LEVEL_DEFINITIONS = [
  { key: 'none', label: 'Início', minSales: 0 },
  { key: 'bronze', label: 'Bronze', minSales: 10 },
  { key: 'silver', label: 'Prata', minSales: 50 },
  { key: 'gold', label: 'Ouro', minSales: 101 },
];

const LEVEL_ORDER = { none: 0, bronze: 1, silver: 2, gold: 3 };

const LEVELS = LEVEL_DEFINITIONS.map(level => ({
  ...level,
  commissionPerOrder: DEFAULT_COMMISSION_CONFIG.commissions[level.key],
}));

const TICKET_MULTIPLIER_THRESHOLD = DEFAULT_COMMISSION_CONFIG.ticketThreshold;
const TICKET_MULTIPLIER_VALUE = DEFAULT_COMMISSION_CONFIG.ticketBonus;

function normalizeConfig(config = {}) {
  const commissions = config.commissions || {};
  const monthlyLevels = config.monthlyLevels || {};
  const fixedLevels = config.fixedLevels || {};
  const safeThreshold = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;
  return {
    ticketThreshold: Number.isFinite(Number(config.ticketThreshold)) ? Number(config.ticketThreshold) : DEFAULT_COMMISSION_CONFIG.ticketThreshold,
    ticketBonus: Number.isFinite(Number(config.ticketBonus)) ? Number(config.ticketBonus) : DEFAULT_COMMISSION_CONFIG.ticketBonus,
    teamCommissionPerSale: Number.isFinite(Number(config.teamCommissionPerSale)) ? Number(config.teamCommissionPerSale) : DEFAULT_COMMISSION_CONFIG.teamCommissionPerSale,
    commissions: {
      none: Number.isFinite(Number(commissions.none)) ? Number(commissions.none) : DEFAULT_COMMISSION_CONFIG.commissions.none,
      bronze: Number.isFinite(Number(commissions.bronze)) ? Number(commissions.bronze) : DEFAULT_COMMISSION_CONFIG.commissions.bronze,
      silver: Number.isFinite(Number(commissions.silver)) ? Number(commissions.silver) : DEFAULT_COMMISSION_CONFIG.commissions.silver,
      gold: Number.isFinite(Number(commissions.gold)) ? Number(commissions.gold) : DEFAULT_COMMISSION_CONFIG.commissions.gold,
    },
    monthlyLevels: {
      bronze: safeThreshold(monthlyLevels.bronze, DEFAULT_COMMISSION_CONFIG.monthlyLevels.bronze),
      silver: safeThreshold(monthlyLevels.silver, DEFAULT_COMMISSION_CONFIG.monthlyLevels.silver),
      gold: safeThreshold(monthlyLevels.gold, DEFAULT_COMMISSION_CONFIG.monthlyLevels.gold),
    },
    fixedLevels: {
      bronze: safeThreshold(fixedLevels.bronze, DEFAULT_COMMISSION_CONFIG.fixedLevels.bronze),
      silver: safeThreshold(fixedLevels.silver, DEFAULT_COMMISSION_CONFIG.fixedLevels.silver),
      gold: safeThreshold(fixedLevels.gold, DEFAULT_COMMISSION_CONFIG.fixedLevels.gold),
    },
  };
}

function buildLevelDefinitions(config, type = 'monthly') {
  const normalized = normalizeConfig(config);
  const thresholds = type === 'fixed' ? normalized.fixedLevels : normalized.monthlyLevels;
  return [
    { key: 'none', label: 'Início', minSales: 0 },
    { key: 'bronze', label: 'Bronze', minSales: thresholds.bronze },
    { key: 'silver', label: 'Prata', minSales: thresholds.silver },
    { key: 'gold', label: 'Ouro', minSales: thresholds.gold },
  ];
}

function getLevel(sales, config = DEFAULT_COMMISSION_CONFIG, type = 'monthly') {
  const count = Number(sales) || 0;
  const normalized = normalizeConfig(config);
  const definitions = buildLevelDefinitions(normalized, type);
  let current = definitions[0];
  for (const level of definitions) {
    if (count >= level.minSales) current = level;
  }
  const next = definitions.find(level => level.minSales > count) || null;
  const maxThreshold = definitions[3].minSales || 1;
  const progress = Math.min(100, (count / maxThreshold) * 100);
  return {
    ...current,
    type,
    commissionPerOrder: normalized.commissions[current.key],
    sales: count,
    progress,
    nextLevel: next ? next.label : null,
    nextMinSales: next ? next.minSales : null,
    salesToNext: next ? Math.max(0, next.minSales - count) : 0,
  };
}

function monthKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : null;
}

function calculateMonthlyStats(orders, config = DEFAULT_COMMISSION_CONFIG) {
  const paid = (orders || []).filter(order => isPaidOrder(order));
  const normalized = normalizeConfig(config);
  const byMonth = {};

  for (const order of paid) {
    const key = monthKey(order.created_at);
    if (!key) continue;
    if (!byMonth[key]) byMonth[key] = { sales: 0, revenue: 0, averageTicket: 0, multiplierActive: false };
    byMonth[key].sales += 1;
    byMonth[key].revenue += Number(order.total || 0);
  }

  for (const stats of Object.values(byMonth)) {
    stats.averageTicket = stats.sales ? stats.revenue / stats.sales : 0;
    stats.multiplierActive = stats.averageTicket > normalized.ticketThreshold;
  }

  return byMonth;
}

function commissionForOrders(orders, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const paid = (orders || []).filter(order => isPaidOrder(order));
  const monthlyStats = calculateMonthlyStats(paid, normalized);
  const salesByMonth = Object.fromEntries(
    Object.entries(monthlyStats).map(([key, stats]) => [key, stats.sales])
  );

  const cumulativeByMonth = {};
  let cumulativeSales = 0;
  Object.keys(monthlyStats).sort().forEach(key => {
    cumulativeSales += Number(monthlyStats[key].sales || 0);
    cumulativeByMonth[key] = cumulativeSales;
  });

  let total = 0;
  const annotated = paid.map(order => {
    const key = monthKey(order.created_at);
    const stats = monthlyStats[key] || { sales: 0, averageTicket: 0, multiplierActive: false };
    const monthlyLevel = getLevel(stats.sales, normalized, 'monthly');
    const fixedLevel = getLevel(cumulativeByMonth[key] || 0, normalized, 'fixed');
    const explicitFloor = Number(options?.levelFloorByMonth?.[key] || 0);
    const teamJoinedAt = options?.teamJoinedAt ? new Date(options.teamJoinedAt) : null;
    const orderDate = new Date(order.created_at);
    const teamBonusActiveForOrder = Boolean(teamJoinedAt && !Number.isNaN(teamJoinedAt.getTime()) && !Number.isNaN(orderDate.getTime()) && orderDate >= teamJoinedAt && orderDate < new Date(teamJoinedAt.getTime() + 30 * 24 * 60 * 60 * 1000));
    const explicitFloorLevel = explicitFloor > 0 ? getLevel(explicitFloor, normalized, 'fixed').key : 'none';
    // Bônus de Equipe garante diretamente o nível mínimo Bronze por 30 dias.
    // Não convertemos a meta mensal de Bronze para a escala do Bônus Fixo.
    let floorLevelKey = fixedLevel.key;
    if (LEVEL_ORDER[explicitFloorLevel] > LEVEL_ORDER[floorLevelKey]) floorLevelKey = explicitFloorLevel;
    if (teamBonusActiveForOrder && LEVEL_ORDER.bronze > LEVEL_ORDER[floorLevelKey]) floorLevelKey = 'bronze';
    const effectiveLevel = LEVEL_ORDER[monthlyLevel.key] >= LEVEL_ORDER[floorLevelKey]
      ? monthlyLevel
      : getLevel(normalized.monthlyLevels[floorLevelKey] || 0, normalized, 'monthly');
    const multiplier = stats.multiplierActive ? normalized.ticketBonus : 0;
    const currentMonth = monthKey(new Date());
    const isCurrentMonth = key === currentMonth;

    // O mês atual é sempre recalculável conforme as configurações e o nível
    // vigente. Meses anteriores ficam congelados no valor já gravado no pedido.
    let commission;
    let baseCommission;
    if (isCurrentMonth) {
      baseCommission = Number(normalized.commissions[effectiveLevel.key] || 0);
      commission = Number((baseCommission + multiplier).toFixed(2));
    } else {
      const persistedCommission = Number(order?.commission);
      if (Number.isFinite(persistedCommission)) {
        commission = Number(persistedCommission.toFixed(2));
        const persistedBase = Number(order?.commission_base_snapshot);
        baseCommission = Number.isFinite(persistedBase)
          ? Number(persistedBase.toFixed(2))
          : Number(persistedCommission.toFixed(2));
      } else {
        const persistedBase = Number(order?.commission_base_snapshot);
        baseCommission = Number.isFinite(persistedBase)
          ? persistedBase
          : Number(normalized.commissions[effectiveLevel.key] || 0);
        commission = Number((baseCommission + multiplier).toFixed(2));
      }
    }
    total += commission;
    return {
      ...order,
      commission,
      commissionBase: Number(baseCommission.toFixed(2)),
      level: effectiveLevel.label,
      monthlyLevel: monthlyLevel.label,
      fixedLevel: fixedLevel.label,
      month: key,
      ticketAverage: Number(stats.averageTicket.toFixed(2)),
      ticketMultiplier: multiplier,
      ticketMultiplierActive: stats.multiplierActive,
    };
  });

  return { orders: annotated, salesByMonth, monthlyStats, total };
}


async function reconcileAffiliateOrderCommissions(supabaseFetch, affiliateId, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const id = Number(affiliateId);
  if (!Number.isInteger(id) || id <= 0) return { updated: 0, orders: [] };

  const orders = await supabaseFetch(
    `/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=id,status,total,commission,created_at,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot&order=created_at.asc&limit=10000`
  );
  const paid = (orders || []).filter(order => isPaidOrder(order));
  if (!paid.length) return { updated: 0, orders: [] };

  const monthlyStats = calculateMonthlyStats(paid, normalized);
  const cumulativeByMonth = {};
  let cumulativeSales = 0;
  Object.keys(monthlyStats).sort().forEach(key => {
    cumulativeSales += Number(monthlyStats[key].sales || 0);
    cumulativeByMonth[key] = cumulativeSales;
  });

  const currentMonth = monthKey(new Date());
  const teamJoinedAt = options?.teamJoinedAt ? new Date(options.teamJoinedAt) : null;
  const updates = [];

  for (const order of paid) {
    const key = monthKey(order.created_at);
    if (key !== currentMonth) continue;

    const stats = monthlyStats[key] || { sales: 0, revenue: 0, averageTicket: 0, multiplierActive: false };
    const monthlyLevel = getLevel(stats.sales, normalized, 'monthly');
    const fixedLevel = getLevel(cumulativeByMonth[key] || 0, normalized, 'fixed');
    const orderDate = new Date(order.created_at);
    const teamBonusActiveForOrder = Boolean(
      teamJoinedAt &&
      !Number.isNaN(teamJoinedAt.getTime()) &&
      !Number.isNaN(orderDate.getTime()) &&
      orderDate >= teamJoinedAt &&
      orderDate < new Date(teamJoinedAt.getTime() + 30 * 24 * 60 * 60 * 1000)
    );
    // Bônus de Equipe garante diretamente o nível mínimo Bronze por 30 dias.
    // O Bônus Fixo também define um piso permanente para o mês.
    let floorLevelKey = fixedLevel.key;
    if (teamBonusActiveForOrder && LEVEL_ORDER.bronze > LEVEL_ORDER[floorLevelKey]) floorLevelKey = 'bronze';
    const effectiveLevel = LEVEL_ORDER[monthlyLevel.key] >= LEVEL_ORDER[floorLevelKey]
      ? monthlyLevel
      : getLevel(normalized.monthlyLevels[floorLevelKey] || 0, normalized, 'monthly');

    const multiplier = stats.multiplierActive ? normalized.ticketBonus : 0;
    const nextBase = Number(normalized.commissions[effectiveLevel.key] || 0);
    const nextCommission = Number((nextBase + multiplier).toFixed(2));
    const existingBase = Number(order.commission_base_snapshot);
    const existingCommission = Number(order.commission);
    const existingLevel = String(order.commission_level_snapshot || '').toLowerCase();
    const nextTeamSnapshot = Number.isFinite(Number(order.team_commission_snapshot))
      ? Number(order.team_commission_snapshot)
      : Number(normalized.teamCommissionPerSale || 0);

    if (
      existingLevel !== effectiveLevel.key ||
      !Number.isFinite(existingBase) ||
      Math.abs(existingBase - nextBase) > 0.001 ||
      !Number.isFinite(existingCommission) ||
      Math.abs(existingCommission - nextCommission) > 0.001 ||
      !Number.isFinite(Number(order.team_commission_snapshot))
    ) {
      updates.push({
        id: Number(order.id),
        patch: {
          commission: nextCommission,
          commission_level_snapshot: effectiveLevel.key,
          commission_base_snapshot: nextBase,
          team_commission_snapshot: nextTeamSnapshot,
        },
      });
    }
  }

  for (const item of updates) {
    await supabaseFetch(`/rest/v1/affiliate_orders?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(item.patch),
    });
  }

  return { updated: updates.length, orders: paid };
}

function isPaidOrder(order) {
  return new Set(['payment_approved', 'paid', 'pagamento_aprovado']).has(
    String(order?.status || '').toLowerCase()
  );
}

module.exports = {
  DEFAULT_COMMISSION_CONFIG,
  LEVEL_DEFINITIONS,
  LEVEL_ORDER,
  LEVELS,
  TICKET_MULTIPLIER_THRESHOLD,
  TICKET_MULTIPLIER_VALUE,
  normalizeConfig,
  getLevel,
  monthKey,
  calculateMonthlyStats,
  commissionForOrders,
  reconcileAffiliateOrderCommissions,
  isPaidOrder,
};

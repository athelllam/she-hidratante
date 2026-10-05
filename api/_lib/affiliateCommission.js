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

function commissionForSingleOrder(targetOrder, orders, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const targetId = String(targetOrder?.yampi_order_id || targetOrder?.id || '');
  const paidOrders = (orders || []).filter(order => isPaidOrder(order));
  const workingOrders = paidOrders.some(order => String(order?.yampi_order_id || order?.id || '') === targetId)
    ? paidOrders
    : [...paidOrders, targetOrder];
  const result = commissionForOrders(workingOrders, config, options);
  const annotated = result.orders.find(order => String(order?.yampi_order_id || order?.id || '') === targetId);
  return annotated ? Number(annotated.commission || 0) : 0;
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
    const teamBonusFloor = teamBonusActiveForOrder ? normalized.monthlyLevels.bronze : 0;
    const floor = Math.max(explicitFloor, teamBonusFloor, fixedLevel.minSales || 0);
    const floorLevel = getLevel(floor, normalized, 'fixed');
    const effectiveLevel = LEVEL_ORDER[monthlyLevel.key] >= LEVEL_ORDER[floorLevel.key]
      ? monthlyLevel
      : getLevel(normalized.monthlyLevels[floorLevel.key] || 0, normalized, 'monthly');
    const multiplier = stats.multiplierActive ? normalized.ticketBonus : 0;
    const calculatedCommission = Number((effectiveLevel.commissionPerOrder + multiplier).toFixed(2));
    const commission = order?.commission_locked ? Number(order.commission || 0) : calculatedCommission;
    total += commission;
    return {
      ...order,
      commission,
      calculatedCommission,
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
  commissionForSingleOrder,
  isPaidOrder,
};

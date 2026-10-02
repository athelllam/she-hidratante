const DEFAULT_COMMISSION_CONFIG = {
  ticketThreshold: 170,
  ticketBonus: 5,
  commissions: {
    none: 30,
    bronze: 40,
    silver: 50,
    gold: 60,
  },
};

const LEVEL_DEFINITIONS = [
  { key: 'none', label: 'Início', minSales: 0 },
  { key: 'bronze', label: 'Bronze', minSales: 10 },
  { key: 'silver', label: 'Prata', minSales: 50 },
  { key: 'gold', label: 'Ouro', minSales: 101 },
];

const LEVELS = LEVEL_DEFINITIONS.map(level => ({
  ...level,
  commissionPerOrder: DEFAULT_COMMISSION_CONFIG.commissions[level.key],
}));

const TICKET_MULTIPLIER_THRESHOLD = DEFAULT_COMMISSION_CONFIG.ticketThreshold;
const TICKET_MULTIPLIER_VALUE = DEFAULT_COMMISSION_CONFIG.ticketBonus;

function normalizeConfig(config = {}) {
  const commissions = config.commissions || {};
  return {
    ticketThreshold: Number.isFinite(Number(config.ticketThreshold)) ? Number(config.ticketThreshold) : DEFAULT_COMMISSION_CONFIG.ticketThreshold,
    ticketBonus: Number.isFinite(Number(config.ticketBonus)) ? Number(config.ticketBonus) : DEFAULT_COMMISSION_CONFIG.ticketBonus,
    commissions: {
      none: Number.isFinite(Number(commissions.none)) ? Number(commissions.none) : DEFAULT_COMMISSION_CONFIG.commissions.none,
      bronze: Number.isFinite(Number(commissions.bronze)) ? Number(commissions.bronze) : DEFAULT_COMMISSION_CONFIG.commissions.bronze,
      silver: Number.isFinite(Number(commissions.silver)) ? Number(commissions.silver) : DEFAULT_COMMISSION_CONFIG.commissions.silver,
      gold: Number.isFinite(Number(commissions.gold)) ? Number(commissions.gold) : DEFAULT_COMMISSION_CONFIG.commissions.gold,
    },
  };
}

function getLevel(sales, config = DEFAULT_COMMISSION_CONFIG) {
  const count = Number(sales) || 0;
  const normalized = normalizeConfig(config);
  let current = LEVEL_DEFINITIONS[0];
  for (const level of LEVEL_DEFINITIONS) {
    if (count >= level.minSales) current = level;
  }
  const next = LEVEL_DEFINITIONS.find(level => level.minSales > count) || null;
  const progress = Math.min(100, (count / 101) * 100);
  return {
    ...current,
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
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
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

function commissionForOrders(orders, config = DEFAULT_COMMISSION_CONFIG) {
  const normalized = normalizeConfig(config);
  const paid = (orders || []).filter(order => isPaidOrder(order));
  const monthlyStats = calculateMonthlyStats(paid, normalized);
  const salesByMonth = Object.fromEntries(
    Object.entries(monthlyStats).map(([key, stats]) => [key, stats.sales])
  );

  let total = 0;
  const annotated = paid.map(order => {
    const key = monthKey(order.created_at);
    const stats = monthlyStats[key] || { sales: 0, averageTicket: 0, multiplierActive: false };
    const level = getLevel(stats.sales, normalized);
    const multiplier = stats.multiplierActive ? normalized.ticketBonus : 0;
    const commission = Number((level.commissionPerOrder + multiplier).toFixed(2));
    total += commission;
    return {
      ...order,
      commission,
      level: level.label,
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
  LEVELS,
  TICKET_MULTIPLIER_THRESHOLD,
  TICKET_MULTIPLIER_VALUE,
  normalizeConfig,
  getLevel,
  monthKey,
  calculateMonthlyStats,
  commissionForOrders,
  isPaidOrder,
};

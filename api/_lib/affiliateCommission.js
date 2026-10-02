const LEVELS = [
  { key: 'none', label: 'Início', minSales: 0, commissionPerOrder: 0 },
  { key: 'bronze', label: 'Bronze', minSales: 10, commissionPerOrder: 40 },
  { key: 'silver', label: 'Prata', minSales: 50, commissionPerOrder: 50 },
  { key: 'gold', label: 'Ouro', minSales: 100, commissionPerOrder: 60 },
];

const TICKET_MULTIPLIER_THRESHOLD = 170;
const TICKET_MULTIPLIER_VALUE = 5;

function getLevel(sales) {
  const count = Number(sales) || 0;
  let current = LEVELS[0];
  for (const level of LEVELS) {
    if (count >= level.minSales) current = level;
  }
  const next = LEVELS.find(level => level.minSales > count) || null;
  const progress = Math.min(100, (count / 100) * 100);
  return {
    ...current,
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

function calculateMonthlyStats(orders) {
  const paid = (orders || []).filter(order => isPaidOrder(order));
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
    stats.multiplierActive = stats.averageTicket >= TICKET_MULTIPLIER_THRESHOLD;
  }

  return byMonth;
}

function commissionForOrders(orders) {
  const paid = (orders || []).filter(order => isPaidOrder(order));
  const monthlyStats = calculateMonthlyStats(paid);
  const salesByMonth = Object.fromEntries(
    Object.entries(monthlyStats).map(([key, stats]) => [key, stats.sales])
  );

  let total = 0;
  const annotated = paid.map(order => {
    const key = monthKey(order.created_at);
    const stats = monthlyStats[key] || { sales: 0, averageTicket: 0, multiplierActive: false };
    const level = getLevel(stats.sales);
    const multiplier = stats.multiplierActive ? TICKET_MULTIPLIER_VALUE : 0;
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
  LEVELS,
  TICKET_MULTIPLIER_THRESHOLD,
  TICKET_MULTIPLIER_VALUE,
  getLevel,
  monthKey,
  calculateMonthlyStats,
  commissionForOrders,
  isPaidOrder,
};

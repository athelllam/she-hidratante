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

function monthKeyInProgress(value) {
  return monthKey(value);
}

function buildTeamSalesByMonth(teamOrders = []) {
  const byMonth = {};
  for (const order of teamOrders || []) {
    if (!isPaidOrder(order)) continue;
    const key = monthKey(order.created_at);
    if (!key) continue;
    byMonth[key] = Number(byMonth[key] || 0) + 1;
  }
  return byMonth;
}

function teamBonusIsActive(teamJoinedAt, now = new Date()) {
  const start = teamJoinedAt ? new Date(teamJoinedAt) : null;
  if (!start || Number.isNaN(start.getTime())) return false;
  const end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
  const current = now instanceof Date ? now : new Date(now);
  return !Number.isNaN(current.getTime()) && current >= start && current < end;
}

function levelForCurrentMonth({ paid, monthlyStats, normalized, teamSalesByMonth = {}, teamJoinedAt = null, now = new Date() }) {
  const currentMonth = monthKey(now);
  const currentStats = monthlyStats[currentMonth] || { sales: 0, revenue: 0, averageTicket: 0, multiplierActive: false };
  const currentPersonalSales = Number(currentStats.sales || 0);
  const currentTeamSales = Number(teamSalesByMonth?.[currentMonth] || 0);
  const currentMonthPoints = currentPersonalSales + currentTeamSales;

  // Bônus Fixo é permanente e define o piso do novo mês.
  // A equipe garante apenas Bronze durante 30 dias; não adiciona pontos.
  const lifetimeSales = paid.length;
  const fixedLevel = getLevel(lifetimeSales, normalized, 'fixed');
  const teamFloorKey = teamBonusIsActive(teamJoinedAt, now) ? 'bronze' : 'none';
  const baseLevelKey = LEVEL_ORDER[fixedLevel.key] >= LEVEL_ORDER[teamFloorKey]
    ? fixedLevel.key
    : teamFloorKey;
  const basePoints = baseLevelKey === 'gold'
    ? Number(normalized.monthlyLevels.gold)
    : baseLevelKey === 'silver'
      ? Number(normalized.monthlyLevels.silver)
      : baseLevelKey === 'bronze'
        ? Number(normalized.monthlyLevels.bronze)
        : 0;
  const effectiveLevel = getLevel(basePoints + currentMonthPoints, normalized, 'monthly');

  return {
    currentMonth,
    currentStats,
    currentPersonalSales,
    currentTeamSales,
    currentMonthPoints,
    fixedLevel,
    teamFloorKey,
    baseLevelKey,
    basePoints,
    effectiveLevel,
  };
}

function commissionForOrders(orders, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const paid = (orders || []).filter(order => isPaidOrder(order));
  const monthlyStats = calculateMonthlyStats(paid, normalized);
  const salesByMonth = Object.fromEntries(
    Object.entries(monthlyStats).map(([key, stats]) => [key, stats.sales])
  );
  const liveMonth = options?.currentMonthKey || monthKeyInProgress(new Date());
  const teamSalesByMonth = options?.teamSalesByMonth || {};
  const now = options?.now ? new Date(options.now) : new Date();
  const currentLevelData = levelForCurrentMonth({
    paid,
    monthlyStats,
    normalized,
    teamSalesByMonth,
    teamJoinedAt: options?.teamJoinedAt,
    now,
  });

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
    const isCurrentMonth = key === liveMonth;

    if (!isCurrentMonth) {
      // Mês encerrado: a comissão fica congelada exatamente como foi fechada.
      // Nunca usamos a configuração atual para reescrever meses anteriores.
      const storedCommission = Number(order?.commission);
      const fallbackCommission = Number.isFinite(storedCommission)
        ? storedCommission
        : Number.isFinite(Number(order?.commission_base_snapshot))
          ? Number(order.commission_base_snapshot)
          : 0;
      const snapshotLevel = String(order?.commission_level_snapshot || '').toLowerCase();
      const fixedLevel = getLevel(cumulativeByMonth[key] || 0, normalized, 'fixed');
      const levelLabel = snapshotLevel === 'gold' ? 'Ouro' : snapshotLevel === 'silver' ? 'Prata' : snapshotLevel === 'bronze' ? 'Bronze' : snapshotLevel === 'none' ? 'Início' : fixedLevel.label;
      total += Number(fallbackCommission.toFixed(2));
      return {
        ...order,
        commission: Number(fallbackCommission.toFixed(2)),
        commissionBase: Number.isFinite(Number(order?.commission_base_snapshot)) ? Number(Number(order.commission_base_snapshot).toFixed(2)) : Number(fallbackCommission.toFixed(2)),
        level: levelLabel,
        monthlyLevel: levelLabel,
        fixedLevel: fixedLevel.label,
        month: key,
        ticketAverage: Number(stats.averageTicket.toFixed(2)),
        ticketMultiplier: 0,
        ticketMultiplierActive: false,
        commissionFrozen: true,
      };
    }

    // Mês atual: o nível e a comissão são sempre recalculados com a configuração vigente.
    const effectiveLevel = currentLevelData.effectiveLevel;
    const multiplier = currentLevelData.currentStats.multiplierActive ? normalized.ticketBonus : 0;
    const baseCommission = Number(normalized.commissions[effectiveLevel.key] || 0);
    const commission = Number((baseCommission + multiplier).toFixed(2));
    total += commission;
    return {
      ...order,
      commission,
      commissionBase: Number(baseCommission.toFixed(2)),
      level: effectiveLevel.label,
      monthlyLevel: effectiveLevel.label,
      fixedLevel: currentLevelData.fixedLevel.label,
      month: key,
      ticketAverage: Number(currentLevelData.currentStats.averageTicket.toFixed(2)),
      ticketMultiplier: multiplier,
      ticketMultiplierActive: currentLevelData.currentStats.multiplierActive,
      commissionFrozen: false,
    };
  });

  return {
    orders: annotated,
    salesByMonth,
    monthlyStats,
    total,
    currentMonth: liveMonth,
    currentLevel: currentLevelData.effectiveLevel,
    currentFixedLevel: currentLevelData.fixedLevel,
    currentMonthPoints: currentLevelData.currentMonthPoints,
  };
}

async function reconcileAffiliateOrderCommissions(supabaseFetch, affiliateId, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const id = Number(affiliateId);
  if (!Number.isInteger(id) || id <= 0) return { updated: 0, orders: [] };

  const orders = Array.isArray(options?.orders)
    ? options.orders
    : await supabaseFetch(
      `/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=id,status,total,commission,created_at,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot&order=created_at.asc&limit=10000`
    );
  const paid = (orders || []).filter(order => isPaidOrder(order));
  if (!paid.length) return { updated: 0, orders: [] };

  const teamSalesByMonth = options?.teamSalesByMonth || buildTeamSalesByMonth(options?.teamOrders || []);
  const currentMonth = options?.currentMonthKey || monthKey(new Date());
  const result = commissionForOrders(paid, normalized, {
    teamSalesByMonth,
    teamJoinedAt: options?.teamJoinedAt,
    currentMonthKey: currentMonth,
    now: options?.now || new Date(),
  });

  const updates = [];
  for (const annotated of result.orders) {
    if (annotated.month !== currentMonth) continue;
    const original = paid.find(row => Number(row.id) === Number(annotated.id));
    if (!original) continue;
    const nextCommission = Number(annotated.commission || 0);
    const nextBase = Number(annotated.commissionBase || 0);
    const existingCommission = Number(original.commission);
    const existingBase = Number(original.commission_base_snapshot);
    const existingLevel = String(original.commission_level_snapshot || '').toLowerCase();
    const teamMissing = !Number.isFinite(Number(original.team_commission_snapshot));

    if (
      !Number.isFinite(existingCommission) || Math.abs(existingCommission - nextCommission) > 0.001 ||
      existingLevel !== String(result.currentLevel?.key || 'none') ||
      !Number.isFinite(existingBase) || Math.abs(existingBase - nextBase) > 0.001 ||
      teamMissing
    ) {
      const levelKey = result.currentLevel?.key || 'none';
      updates.push({
        id: Number(annotated.id),
        patch: {
          commission: nextCommission,
          commission_level_snapshot: levelKey,
          commission_base_snapshot: nextBase,
          ...(teamMissing ? { team_commission_snapshot: Number(normalized.teamCommissionPerSale || 0) } : {}),
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

  return { updated: updates.length, orders: paid, currentLevel: result.currentLevel };
}

async function reconcileAllCurrentMonthCommissions(supabaseFetch, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const affiliates = Array.isArray(options?.affiliates)
    ? options.affiliates
    : await supabaseFetch('/rest/v1/affiliates?select=id,team_parent_id,team_joined_at&limit=20000');
  const orders = Array.isArray(options?.orders)
    ? options.orders
    : await supabaseFetch('/rest/v1/affiliate_orders?select=id,affiliate_id,status,total,commission,created_at,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot&order=created_at.asc&limit=50000');

  const parentByAffiliate = new Map((affiliates || []).map(row => [Number(row.id), row.team_parent_id ? Number(row.team_parent_id) : null]));
  const ordersByAffiliate = new Map();
  const teamSalesByParent = new Map();
  const paid = (orders || []).filter(isPaidOrder);
  for (const order of paid) {
    const childId = Number(order.affiliate_id);
    if (!ordersByAffiliate.has(childId)) ordersByAffiliate.set(childId, []);
    ordersByAffiliate.get(childId).push(order);
    const parentId = parentByAffiliate.get(childId);
    const key = monthKey(order.created_at);
    if (parentId && key) {
      if (!teamSalesByParent.has(parentId)) teamSalesByParent.set(parentId, {});
      const bucket = teamSalesByParent.get(parentId);
      bucket[key] = Number(bucket[key] || 0) + 1;
    }
  }

  const currentMonth = options?.currentMonthKey || monthKey(new Date());
  let updated = 0;
  const levels = [];
  for (const affiliate of affiliates || []) {
    const id = Number(affiliate.id);
    const ownOrders = ordersByAffiliate.get(id) || [];
    if (!ownOrders.some(order => monthKey(order.created_at) === currentMonth)) continue;
    const result = await reconcileAffiliateOrderCommissions(supabaseFetch, id, normalized, {
      orders: ownOrders,
      teamSalesByMonth: teamSalesByParent.get(id) || {},
      teamJoinedAt: affiliate.team_joined_at,
      currentMonthKey: currentMonth,
      now: options?.now || new Date(),
    });
    updated += Number(result.updated || 0);
    levels.push({ affiliateId: id, level: result.currentLevel?.key || 'none' });
  }
  return { updated, currentMonth, levels };
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
  reconcileAllCurrentMonthCommissions,
  isPaidOrder,
};

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

function teamBonusActiveAt(dateValue, teamJoinedAt) {
  const joined = teamJoinedAt ? new Date(teamJoinedAt) : null;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (!joined || Number.isNaN(joined.getTime()) || Number.isNaN(date.getTime())) return false;
  // 30 consecutive 24-hour periods from the recorded team-entry timestamp.
  const expiresAt = joined.getTime() + 30 * 24 * 60 * 60 * 1000;
  return date.getTime() >= joined.getTime() && date.getTime() < expiresAt;
}

function monthEndInstant(month) {
  if (!month) return null;
  const [year, monthNumber] = String(month).split('-').map(Number);
  if (!year || !monthNumber) return null;
  // São Paulo month-end: the instant immediately before the next local month.
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  return new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00-03:00`).getTime() - 1;
}

function levelForMonthEnd(month, monthlyStats, cumulativeByMonth, config, teamJoinedAt, teamSalesByMonth = {}) {
  const normalized = normalizeConfig(config);
  const stats = monthlyStats[month] || { sales: 0 };
  const teamSales = Number(teamSalesByMonth?.[month] || 0);
  const fixedLevel = getLevel(cumulativeByMonth[month] || 0, normalized, 'fixed');
  const monthEnd = monthEndInstant(month);
  const teamBonusAtClose = monthEnd !== null && teamBonusActiveAt(new Date(monthEnd), teamJoinedAt);
  let floorLevelKey = fixedLevel.key;
  if (teamBonusAtClose && LEVEL_ORDER.bronze > LEVEL_ORDER[floorLevelKey]) floorLevelKey = 'bronze';
  const floorPoints = floorLevelKey === 'gold'
    ? Number(normalized.monthlyLevels.gold || 101)
    : floorLevelKey === 'silver'
      ? Number(normalized.monthlyLevels.silver || 50)
      : floorLevelKey === 'bronze'
        ? Number(normalized.monthlyLevels.bronze || 10)
        : 0;
  return getLevel(floorPoints + Number(stats.sales || 0) + teamSales, normalized, 'monthly');
}

function commissionForOrders(orders, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const paid = (orders || []).filter(order => isPaidOrder(order));
  const monthlyStats = calculateMonthlyStats(paid, normalized);
  const lifetimeRevenue = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lifetimeAverageTicket = paid.length ? lifetimeRevenue / paid.length : 0;
  const lifetimeTicketMultiplierActive = lifetimeAverageTicket > normalized.ticketThreshold;
  const lifetimeTicketMultiplier = lifetimeTicketMultiplierActive ? normalized.ticketBonus : 0;
  const salesByMonth = Object.fromEntries(
    Object.entries(monthlyStats).map(([key, stats]) => [key, stats.sales])
  );

  const cumulativeByMonth = {};
  let cumulativeSales = 0;
  Object.keys(monthlyStats).sort().forEach(key => {
    cumulativeSales += Number(monthlyStats[key].sales || 0);
    cumulativeByMonth[key] = cumulativeSales;
  });

  const currentMonth = monthKey(new Date());
  const historicalLevelByMonth = {};
  for (const key of Object.keys(monthlyStats)) {
    historicalLevelByMonth[key] = levelForMonthEnd(key, monthlyStats, cumulativeByMonth, normalized, options?.teamJoinedAt, options?.teamSalesByMonth || {});
  }

  let total = 0;
  const annotated = paid.map(order => {
    const key = monthKey(order.created_at);
    const stats = monthlyStats[key] || { sales: 0, averageTicket: 0, multiplierActive: false };
    const monthlyLevel = getLevel(stats.sales, normalized, 'monthly');
    const fixedLevel = getLevel(cumulativeByMonth[key] || 0, normalized, 'fixed');
    const historicalLevel = historicalLevelByMonth[key] || monthlyLevel;
    const effectiveLevel = key === currentMonth
      ? historicalLevel
      : historicalLevel;
    const multiplier = lifetimeTicketMultiplier;
    const isCurrentMonth = key === currentMonth;

    // O card do mês atual é a fonte da verdade. Para meses encerrados,
    // usamos o nível consolidado no fechamento daquele mês, preservado pelo snapshot.
    let cardLevelKey;
    if (isCurrentMonth) {
      if (LEVEL_ORDER[options?.levelKey] !== undefined) {
        cardLevelKey = options.levelKey;
      } else {
        const fixedFloor = getLevel(cumulativeByMonth[key] || 0, normalized, 'fixed');
        const teamFloor = teamBonusActiveAt(new Date(), options?.teamJoinedAt) ? 'bronze' : 'none';
        const floorKey = LEVEL_ORDER[teamFloor] > LEVEL_ORDER[fixedFloor.key] ? teamFloor : fixedFloor.key;
        const floorPoints = floorKey === 'gold'
          ? Number(normalized.monthlyLevels.gold || 101)
          : floorKey === 'silver'
            ? Number(normalized.monthlyLevels.silver || 50)
            : floorKey === 'bronze'
              ? Number(normalized.monthlyLevels.bronze || 10)
              : 0;
        const teamSales = Number(options?.teamSalesByMonth?.[key] || 0);
        cardLevelKey = getLevel(floorPoints + Number(stats.sales || 0) + teamSales, normalized, 'monthly').key;
      }
    } else {
      cardLevelKey = String(order?.commission_level_snapshot || '').toLowerCase();
      if (LEVEL_ORDER[cardLevelKey] === undefined) cardLevelKey = historicalLevel.key;
    }

    let baseCommission = Number(normalized.commissions[cardLevelKey] || 0);
    let commission;
    const snapshotLevelKey = String(order?.commission_level_snapshot || '').toLowerCase();
    const hasPersistedCommission = Number.isFinite(Number(order?.commission)) && Number(order?.commission) > 0
      && LEVEL_ORDER[snapshotLevelKey] !== undefined;

    // O valor-base de uma venda fica congelado. Somente o mês atual pode ser
    // recalculado quando uma META altera o nível da afiliada. O Bônus de
    // Valor também é dinâmico, mas suas alterações afetam apenas o mês atual.
    if (hasPersistedCommission) {
      const snapshotBase = Number(order?.commission_base_snapshot);
      baseCommission = Number.isFinite(snapshotBase) ? snapshotBase : baseCommission;
      if (isCurrentMonth) {
        if (LEVEL_ORDER[cardLevelKey] !== undefined && cardLevelKey !== snapshotLevelKey) {
          baseCommission = Number(normalized.commissions[cardLevelKey] || 0);
        } else {
          cardLevelKey = snapshotLevelKey;
        }
        commission = Number((baseCommission + multiplier).toFixed(2));
      } else {
        cardLevelKey = snapshotLevelKey;
        commission = Number(order.commission);
      }
    } else {
      commission = Number((baseCommission + multiplier).toFixed(2));
    }
    total += commission;
    return {
      ...order,
      commission,
      commissionBase: Number(baseCommission.toFixed(2)),
      level: (LEVEL_DEFINITIONS.find(l => l.key === cardLevelKey)?.label) || historicalLevel.label,
      monthlyLevel: monthlyLevel.label,
      fixedLevel: fixedLevel.label,
      month: key,
      ticketAverage: Number(lifetimeAverageTicket.toFixed(2)),
      ticketMultiplier: multiplier,
      ticketMultiplierActive: lifetimeTicketMultiplierActive,
    };
  });

  return { orders: annotated, salesByMonth, monthlyStats, total, levelByMonth: historicalLevelByMonth };
}


async function reconcileAffiliateOrderCommissions(supabaseFetch, affiliateId, config = DEFAULT_COMMISSION_CONFIG, options = {}) {
  const normalized = normalizeConfig(config);
  const id = Number(affiliateId);
  if (!Number.isInteger(id) || id <= 0) return { updated: 0, orders: [] };

  const orders = await supabaseFetch(
    `/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=id,status,total,commission,created_at,commission_level_snapshot,commission_base_snapshot,commission_locked,team_commission_snapshot&order=created_at.asc&limit=10000`
  );
  const paid = (orders || []).filter(order => isPaidOrder(order));
  if (!paid.length) return { updated: 0, orders: [] };

  const monthlyStats = calculateMonthlyStats(paid, normalized);
  const lifetimeRevenue = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const lifetimeAverageTicket = paid.length ? lifetimeRevenue / paid.length : 0;
  const lifetimeTicketMultiplierActive = lifetimeAverageTicket > normalized.ticketThreshold;
  const lifetimeTicketMultiplier = lifetimeTicketMultiplierActive ? normalized.ticketBonus : 0;

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
    if (!key) continue;

    const existingLevel = String(order.commission_level_snapshot || '').toLowerCase();
    const hasPersistedSnapshot = Number.isFinite(Number(order.commission))
      && Number(order.commission) > 0
      && LEVEL_ORDER[existingLevel] !== undefined
      && Number.isFinite(Number(order.commission_base_snapshot));

    const stats = monthlyStats[key] || { sales: 0, revenue: 0, averageTicket: 0, multiplierActive: false };
    const historicalLevel = levelForMonthEnd(
      key,
      monthlyStats,
      cumulativeByMonth,
      normalized,
      teamJoinedAt,
      options?.teamSalesByMonth || {}
    );

    // REGRA DOS NÍVEIS:
    // - Somente o mês atual pode ser recalculado em tempo real quando as
    //   metas de Bônus Mensal ou Bônus Fixo mudam no Admin.
    // - Isso inclui vendas já realizadas no mês: se a afiliada passa a
    //   atingir Bronze/Prata/Ouro, todas as vendas daquele mês recebem o
    //   nível retroativamente.
    // - Meses encerrados preservam o nível que já foi adquirido no fechamento.
    const computedLevelKey = key === currentMonth && LEVEL_ORDER[options?.levelKey] !== undefined
      ? options.levelKey
      : historicalLevel.key;

    const currentLevelChanged = key === currentMonth && existingLevel !== computedLevelKey;
    const currentLevelNeedsInitialSnapshot = key === currentMonth && !hasPersistedSnapshot;

    // O valor-base do pedido é congelado quando ele entra em determinado
    // nível. Se o nível do mês atual mudar por uma nova meta, usamos o valor
    // atualmente configurado para o novo nível; depois disso ele fica
    // congelado até que o nível do mês mude novamente.
    let nextLevel = hasPersistedSnapshot ? existingLevel : computedLevelKey;
    let nextBase = hasPersistedSnapshot ? Number(order.commission_base_snapshot) : Number(normalized.commissions[nextLevel] || 0);

    if (currentLevelChanged || currentLevelNeedsInitialSnapshot) {
      nextLevel = computedLevelKey;
      nextBase = Number(normalized.commissions[nextLevel] || 0);
    }

    // Bônus de Valor é a única bonificação deliberadamente dinâmica:
    // depende da média de todas as vendas e das configurações atuais de
    // Meta Ticket Médio/Bônus de Valor. Por isso o adicional pode mudar
    // imediatamente até mesmo em vendas antigas.
    // Somente o mês atual pode sofrer recálculo dinâmico. Meses anteriores
    // mantêm exatamente a comissão e o saldo já adquiridos.
    const nextCommission = key === currentMonth
      ? Number((nextBase + lifetimeTicketMultiplier).toFixed(2))
      : (hasPersistedSnapshot ? Number(order.commission) : Number((nextBase + lifetimeTicketMultiplier).toFixed(2)));
    const existingBase = Number(order.commission_base_snapshot);
    const existingCommission = Number(order.commission);
    const existingTeamSnapshot = Number(order.team_commission_snapshot);
    const nextTeamSnapshot = Number.isFinite(existingTeamSnapshot)
      ? existingTeamSnapshot
      : Number(normalized.teamCommissionPerSale || 0);

    const needsUpdate = !hasPersistedSnapshot
      || currentLevelChanged
      || !Number.isFinite(existingCommission)
      || Math.abs(existingCommission - nextCommission) > 0.001
      || !Number.isFinite(existingBase)
      || Math.abs(existingBase - nextBase) > 0.001
      || !Number.isFinite(existingTeamSnapshot);

    if (needsUpdate) {
      updates.push({
        id: Number(order.id),
        patch: {
          commission: nextCommission,
          commission_level_snapshot: nextLevel,
          commission_base_snapshot: nextBase,
          commission_locked: key !== currentMonth,
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

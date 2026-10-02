const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const {
  getLevel,
  commissionForOrders,
  DEFAULT_COMMISSION_CONFIG,
  normalizeConfig,
} = require('../_lib/affiliateCommission');

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function validMonth(value) {
  return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : null;
}

function monthRange(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  return { start, end };
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

function dayKey(date) {
  return String(date || '').slice(0, 10);
}

function monthLabelForChart(value) {
  const [year, month] = String(value || '').split('-').map(Number);
  if (!year || !month) return String(value || '');
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace('.', '');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliate } = await requireAffiliate(req);
    const id = affiliate.id;
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const requestedMonth = String(req.query?.month || '');
    const isAllMonths = requestedMonth === 'all';
    const selectedMonth = isAllMonths ? 'all' : (validMonth(requestedMonth) || defaultMonth);
    const { start, end } = isAllMonths ? { start: new Date(0), end: new Date(8640000000000000) } : monthRange(selectedMonth);

    const [events, orders, withdrawals, settingRows] = await Promise.all([
      supabaseFetch(`/rest/v1/affiliate_events?affiliate_id=eq.${id}&select=type,created_at&order=created_at.desc&limit=10000`),
      supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,created_at,updated_at&order=created_at.desc&limit=5000`),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${id}&status=in.(pending,approved,paid)&select=id,amount,status,pix_key,requested_at,processed_at,note&order=requested_at.desc&limit=500`),
      supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,commission_none,commission_bronze,commission_silver,commission_gold&limit=1'),
    ]);

    const settings = normalizeConfig(settingRows?.[0] ? {
      ticketThreshold: settingRows[0].ticket_threshold,
      ticketBonus: settingRows[0].ticket_bonus,
      commissions: { none: settingRows[0].commission_none, bronze: settingRows[0].commission_bronze, silver: settingRows[0].commission_silver, gold: settingRows[0].commission_gold },
    } : DEFAULT_COMMISSION_CONFIG);

    const accessEvents = (events || []).filter((e) => e.type === 'access');
    const { orders: annotatedPaidOrders, total: totalEarnedCommission, salesByMonth, monthlyStats } = commissionForOrders(orders || [], settings);

    const selectedOrders = annotatedPaidOrders.filter((o) => {
      const date = new Date(o.created_at);
      return date >= start && date < end;
    });
    const selectedAccesses = accessEvents.filter((e) => {
      const date = new Date(e.created_at);
      return date >= start && date < end;
    });
    const selectedWithdrawals = (withdrawals || []).filter((w) => {
      const date = new Date(w.requested_at);
      return date >= start && date < end;
    });

    const selectedSales = selectedOrders.length;
    const selectedRevenue = selectedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const selectedAverageTicket = selectedSales ? selectedRevenue / selectedSales : 0;
    const ticketMultiplierActive = !isAllMonths && selectedAverageTicket > settings.ticketThreshold;
    const selectedCommission = selectedOrders.reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const reserved = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableCommission = Math.max(0, totalEarnedCommission - reserved);
    const level = getLevel(selectedSales, settings);

    // Saldo acumulado: o saldo de abertura do mês é o saldo final do mês anterior.
    // Saques pending/approved/paid já reduzem o saldo disponível imediatamente.
    const selectedWithdrawalsTotal = selectedWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const commissionBeforeSelectedMonth = isAllMonths ? 0 : annotatedPaidOrders
      .filter(o => o.month < selectedMonth)
      .reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const withdrawalsBeforeSelectedMonth = isAllMonths ? 0 : (withdrawals || [])
      .filter(w => String(w.requested_at || '').slice(0, 7) < selectedMonth)
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const openingBalance = isAllMonths
      ? 0
      : Math.max(0, commissionBeforeSelectedMonth - withdrawalsBeforeSelectedMonth);
    const closingBalance = isAllMonths
      ? availableCommission
      : Math.max(0, openingBalance + selectedCommission - selectedWithdrawalsTotal);

    const eventMonths = accessEvents.map(e => String(e.created_at).slice(0, 7)).filter(Boolean);
    const withdrawalMonths = (withdrawals || []).map(w => String(w.requested_at).slice(0, 7)).filter(Boolean);
    const historicalMonths = Array.from(new Set([
      ...Object.keys(salesByMonth),
      ...eventMonths,
      ...withdrawalMonths,
      ...(isAllMonths ? [] : [selectedMonth]),
    ])).filter(Boolean).sort();

    let chart;
    if (isAllMonths) {
      const monthMap = {};
      for (const month of historicalMonths) {
        monthMap[month] = { date: month, label: monthLabelForChart(month), access: 0, revenue: 0, sales: 0 };
      }
      for (const e of selectedAccesses) {
        const key = String(e.created_at || '').slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { date: key, label: monthLabelForChart(key), access: 0, revenue: 0, sales: 0 };
        monthMap[key].access++;
      }
      for (const o of selectedOrders) {
        const key = o.month || String(o.created_at || '').slice(0, 7);
        if (!monthMap[key]) monthMap[key] = { date: key, label: monthLabelForChart(key), access: 0, revenue: 0, sales: 0 };
        monthMap[key].revenue += Number(o.total || 0);
        monthMap[key].sales++;
      }
      chart = Object.values(monthMap).sort((a, b) => a.date.localeCompare(b.date));
    } else {
      const days = daysInMonth(selectedMonth);
      const byDay = Array.from({ length: days }, (_, index) => {
        const day = String(index + 1).padStart(2, '0');
        return { date: `${selectedMonth}-${day}`, day: index + 1, access: 0, revenue: 0, sales: 0 };
      });
      const dayMap = Object.fromEntries(byDay.map(item => [item.date, item]));

      for (const e of selectedAccesses) {
        const item = dayMap[dayKey(e.created_at)];
        if (item) item.access++;
      }
      for (const o of selectedOrders) {
        const item = dayMap[dayKey(o.created_at)];
        if (item) {
          item.revenue += Number(o.total || 0);
          item.sales++;
        }
      }
      chart = byDay;
    }

    return json(res, 200, {
      affiliate,
      settings,
      selectedMonth,
      isAllMonths,
      metrics: {
        accesses: selectedAccesses.length,
        sales: selectedSales,
        revenue: money(selectedRevenue),
        averageTicket: money(selectedAverageTicket),
        commission: money(selectedCommission),
        earnedCommission: money(selectedCommission),
        availableCommission: money(availableCommission),
        reservedWithdrawals: money(reserved),
        openingBalance: money(openingBalance),
        closingBalance: money(closingBalance),
        selectedWithdrawals: money(selectedWithdrawalsTotal),
        ticketMultiplier: money(ticketMultiplierActive ? settings.ticketBonus : 0),
        ticketMultiplierActive,
        ticketMultiplierThreshold: settings.ticketThreshold,
        ticketMultiplierValue: settings.ticketBonus,
      },
      level: {
        key: level.key,
        label: level.label,
        sales: level.sales,
        commissionPerOrder: level.commissionPerOrder,
        progress: level.progress,
        nextLevel: level.nextLevel,
        nextMinSales: level.nextMinSales,
        salesToNext: level.salesToNext,
      },
      months: historicalMonths,
      orders: selectedOrders.slice(0, 100),
      withdrawals: selectedWithdrawals,
      monthlyStats,
      chart,
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar dashboard.' });
  }
};

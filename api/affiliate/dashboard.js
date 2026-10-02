const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const {
  getLevel,
  commissionForOrders,
  TICKET_MULTIPLIER_THRESHOLD,
  TICKET_MULTIPLIER_VALUE,
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

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliate } = await requireAffiliate(req);
    const id = affiliate.id;
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonth = validMonth(req.query?.month) || defaultMonth;
    const { start, end } = monthRange(selectedMonth);

    const [events, orders, withdrawals] = await Promise.all([
      supabaseFetch(`/rest/v1/affiliate_events?affiliate_id=eq.${id}&select=type,created_at&order=created_at.desc&limit=10000`),
      supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,created_at,updated_at&order=created_at.desc&limit=5000`),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${id}&status=in.(pending,approved,paid)&select=id,amount,status,requested_at,processed_at,note&order=requested_at.desc&limit=500`),
    ]);

    const accessEvents = (events || []).filter((e) => e.type === 'access');
    const { orders: annotatedPaidOrders, total: totalEarnedCommission, salesByMonth, monthlyStats } = commissionForOrders(orders || []);

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
    const ticketMultiplierActive = selectedAverageTicket > TICKET_MULTIPLIER_THRESHOLD;
    const selectedCommission = selectedOrders.reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const reserved = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableCommission = Math.max(0, totalEarnedCommission - reserved);
    const level = getLevel(selectedSales);

    // Saldo acumulado: o saldo de abertura do mês é o saldo final do mês anterior.
    // Saques pending/approved/paid já reduzem o saldo disponível imediatamente.
    const selectedWithdrawalsTotal = selectedWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const commissionBeforeSelectedMonth = annotatedPaidOrders
      .filter(o => o.month < selectedMonth)
      .reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const withdrawalsBeforeSelectedMonth = (withdrawals || [])
      .filter(w => String(w.requested_at || '').slice(0, 7) < selectedMonth)
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const openingBalance = Math.max(0, commissionBeforeSelectedMonth - withdrawalsBeforeSelectedMonth);
    const closingBalance = Math.max(0, openingBalance + selectedCommission - selectedWithdrawalsTotal);

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

    const eventMonths = accessEvents.map(e => String(e.created_at).slice(0, 7)).filter(Boolean);
    const withdrawalMonths = (withdrawals || []).map(w => String(w.requested_at).slice(0, 7)).filter(Boolean);
    const historicalMonths = Array.from(new Set([
      ...Object.keys(salesByMonth),
      ...eventMonths,
      ...withdrawalMonths,
      selectedMonth,
    ])).sort().reverse();

    return json(res, 200, {
      affiliate,
      selectedMonth,
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
        ticketMultiplier: money(ticketMultiplierActive ? TICKET_MULTIPLIER_VALUE : 0),
        ticketMultiplierActive,
        ticketMultiplierThreshold: TICKET_MULTIPLIER_THRESHOLD,
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
      chart: byDay,
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar dashboard.' });
  }
};

const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');

function money(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliate } = await requireAffiliate(req);
    const id = affiliate.id;

    const [events, orders, withdrawals] = await Promise.all([
      supabaseFetch(`/rest/v1/affiliate_events?affiliate_id=eq.${id}&select=type,created_at&order=created_at.desc&limit=10000`),
      supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${id}&select=yampi_order_id,status,total,commission,created_at,updated_at&order=created_at.desc&limit=5000`),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${id}&status=in.(pending,approved,paid)&select=amount,status,requested_at&order=requested_at.desc&limit=500`),
    ]);

    const accessEvents = (events || []).filter((e) => e.type === 'access');
    const paidStatuses = new Set(['paid','approved','payment_approved','processing','shipped','delivered','completed']);
    const cancelledStatuses = new Set(['cancelled','canceled','refunded','chargeback','payment_refunded']);

    const validOrders = (orders || []).filter((o) => !cancelledStatuses.has(String(o.status || '').toLowerCase()));
    const paidOrders = validOrders.filter((o) => paidStatuses.has(String(o.status || '').toLowerCase()));
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const commission = paidOrders.reduce((sum, o) => sum + Number(o.commission || 0), 0);
    const reserved = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const availableCommission = Math.max(0, commission - reserved);

    const byDay = {};
    for (const e of events || []) {
      const day = String(e.created_at).slice(0,10);
      byDay[day] ||= { date: day, access: 0, revenue: 0, sales: 0 };
      if (e.type === 'access') byDay[day].access++;
    }
    for (const o of paidOrders) {
      const day = String(o.created_at).slice(0,10);
      byDay[day] ||= { date: day, access: 0, revenue: 0, sales: 0 };
      byDay[day].revenue += Number(o.total || 0);
      byDay[day].sales++;
    }

    return json(res, 200, {
      affiliate,
      metrics: {
        accesses: accessEvents.length,
        sales: paidOrders.length,
        revenue: money(revenue),
        averageTicket: money(paidOrders.length ? revenue / paidOrders.length : 0),
        commission: money(availableCommission),
        earnedCommission: money(commission),
        reservedWithdrawals: money(reserved),
      },
      orders: (orders || []).slice(0,100),
      withdrawals: withdrawals || [],
      chart: Object.values(byDay).sort((a,b) => a.date.localeCompare(b.date)).slice(-30),
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao carregar dashboard.' });
  }
};

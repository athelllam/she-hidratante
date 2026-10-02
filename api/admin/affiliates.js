const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { commissionForOrders, isPaidOrder } = require('../_lib/affiliateCommission');

function json(res, status, body) { res.status(status).json(body); }
function money(value) { return Math.round((Number(value) || 0) * 100) / 100; }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const [affiliates, orders, withdrawals] = await Promise.all([
        supabaseFetch('/rest/v1/affiliates?select=id,slug,name,email,active,commission_rate,created_at&order=created_at.desc'),
        supabaseFetch('/rest/v1/affiliate_orders?select=affiliate_id,status,total,commission,created_at&order=created_at.desc&limit=20000'),
        supabaseFetch('/rest/v1/affiliate_withdrawals?select=affiliate_id,amount,status,requested_at&order=requested_at.desc&limit=10000'),
      ]);

      const ordersByAffiliate = new Map();
      for (const order of orders || []) {
        const id = Number(order.affiliate_id);
        if (!ordersByAffiliate.has(id)) ordersByAffiliate.set(id, []);
        ordersByAffiliate.get(id).push(order);
      }

      const stats = new Map();
      for (const affiliate of affiliates || []) {
        const affiliateOrders = ordersByAffiliate.get(Number(affiliate.id)) || [];
        const paidOrders = affiliateOrders.filter(isPaidOrder);
        const commissionData = commissionForOrders(affiliateOrders);
        const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        stats.set(Number(affiliate.id), {
          sales: paidOrders.length,
          revenue,
          commission: commissionData.total,
          withdrawals: 0,
        });
      }

      for (const withdrawal of withdrawals || []) {
        const id = Number(withdrawal.affiliate_id);
        const bucket = stats.get(id);
        if (!bucket) continue;
        if (['pending', 'approved', 'paid'].includes(String(withdrawal.status || '').toLowerCase())) {
          bucket.withdrawals += Number(withdrawal.amount || 0);
        }
      }

      const result = (affiliates || []).map(affiliate => {
        const bucket = stats.get(Number(affiliate.id)) || { sales: 0, revenue: 0, commission: 0, withdrawals: 0 };
        return {
          ...affiliate,
          sales: bucket.sales,
          revenue: money(bucket.revenue),
          averageTicket: money(bucket.sales ? bucket.revenue / bucket.sales : 0),
          earnedCommission: money(bucket.commission),
          balance: money(Math.max(0, bucket.commission - bucket.withdrawals)),
        };
      });

      return json(res, 200, { affiliates: result });
    }

    if (req.method === 'PATCH') {
      const { id, active, commissionRate } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID obrigatório.' });
      const patch = {};
      if (typeof active === 'boolean') patch.active = active;
      if (commissionRate != null) patch.commission_rate = Number(commissionRate);
      if (!Object.keys(patch).length) return json(res, 400, { error: 'Nenhuma alteração informada.' });
      const rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      return json(res, 200, { affiliate: rows?.[0] || null });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no painel administrativo.' });
  }
};

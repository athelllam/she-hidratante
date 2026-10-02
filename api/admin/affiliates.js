const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { commissionForOrders, isPaidOrder } = require('../_lib/affiliateCommission');

function json(res, status, body) { res.status(status).json(body); }
function money(value) { return Math.round((Number(value) || 0) * 100) / 100; }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const [affiliates, orders, withdrawals] = await Promise.all([
        supabaseFetch('/rest/v1/affiliates?select=id,slug,name,email,whatsapp,pix_key,active,admin_active,commission_rate,created_at&order=created_at.desc'),
        supabaseFetch('/rest/v1/affiliate_orders?select=affiliate_id,status,total,commission,created_at&order=created_at.desc&limit=20000'),
        supabaseFetch('/rest/v1/affiliate_withdrawals?select=affiliate_id,amount,status,requested_at&order=requested_at.desc&limit=10000'),
      ]);

      const ordersByAffiliate = new Map();
      for (const order of orders || []) {
        const id = Number(order.affiliate_id);
        if (!ordersByAffiliate.has(id)) ordersByAffiliate.set(id, []);
        ordersByAffiliate.get(id).push(order);
      }

      const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const staleAffiliateIds = [];

      for (const affiliate of affiliates || []) {
        const affiliateOrders = ordersByAffiliate.get(Number(affiliate.id)) || [];
        const paidOrders = affiliateOrders.filter(isPaidOrder);
        const lastSaleAt = paidOrders.reduce((latest, order) => {
          const value = order.created_at ? new Date(order.created_at).getTime() : 0;
          return value > latest ? value : latest;
        }, 0);
        if (Boolean(affiliate.admin_active) && lastSaleAt > 0 && lastSaleAt < cutoff) {
          staleAffiliateIds.push(Number(affiliate.id));
        }
      }

      if (staleAffiliateIds.length) {
        await Promise.all(staleAffiliateIds.map(id =>
          supabaseFetch(`/rest/v1/affiliates?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ admin_active: false }),
          }).catch(() => null)
        ));
        for (const affiliate of affiliates || []) {
          if (staleAffiliateIds.includes(Number(affiliate.id))) affiliate.admin_active = false;
        }
      }

      const stats = new Map();
      for (const affiliate of affiliates || []) {
        const affiliateOrders = ordersByAffiliate.get(Number(affiliate.id)) || [];
        const paidOrders = affiliateOrders.filter(isPaidOrder);
        const lastSaleAt = paidOrders.reduce((latest, order) => {
          const value = order.created_at ? new Date(order.created_at).getTime() : 0;
          return value > latest ? value : latest;
        }, 0);
        const commissionData = commissionForOrders(affiliateOrders);
        const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
        stats.set(Number(affiliate.id), {
          sales: paidOrders.length,
          revenue,
          commission: commissionData.total,
          withdrawals: 0,
          lastSaleAt: lastSaleAt ? new Date(lastSaleAt).toISOString() : null,
          autoInactive: lastSaleAt > 0 && lastSaleAt < cutoff,
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
          adminActive: Boolean(affiliate.admin_active),
          lastSaleAt: bucket.lastSaleAt,
          autoInactive: Boolean(bucket.autoInactive),
        };
      });

      return json(res, 200, { affiliates: result });
    }

    if (req.method === 'DELETE') {
      const { id, confirmName, confirmPhrase } = req.body || {};
      const affiliateId = Number(id);
      if (!Number.isInteger(affiliateId) || affiliateId <= 0) {
        return json(res, 400, { error: 'ID da afiliada inválido.' });
      }
      if (String(confirmPhrase || '') !== 'EXCLUIR') {
        return json(res, 400, { error: 'Confirmação final inválida.' });
      }

      const current = await supabaseFetch(
        `/rest/v1/affiliates?id=eq.${affiliateId}&select=id,auth_user_id,name,slug,email&limit=1`
      );
      if (!current?.[0]) return json(res, 404, { error: 'Afiliada não encontrada.' });

      const affiliate = current[0];
      if (String(confirmName || '').trim() !== String(affiliate.name || '').trim()) {
        return json(res, 400, { error: 'O nome digitado não corresponde à afiliada selecionada.' });
      }

      // A remoção da linha em public.affiliates dispara CASCADE nos
      // registros de eventos, pedidos e saques relacionados.
      // O usuário do Supabase Auth é removido separadamente logo depois.
      try {
        await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}`, {
          method: 'DELETE',
          headers: { Prefer: 'return=minimal' },
        });
      } catch (error) {
        return json(res, 500, {
          error: 'Os dados SQL não puderam ser excluídos. A conta de autenticação não foi removida.',
          partial: false,
          details: error.message,
        });
      }

      if (affiliate.auth_user_id) {
        try {
          await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(affiliate.auth_user_id)}`, {
            method: 'DELETE',
          });
        } catch (error) {
          return json(res, 500, {
            error: 'Os dados SQL foram excluídos, mas a conta de autenticação não pôde ser removida. Exclua o usuário correspondente no Supabase Auth.',
            partial: true,
            details: error.message,
          });
        }
      }

      return json(res, 200, {
        deleted: true,
        affiliateId,
        message: 'Afiliada, conta de autenticação e registros relacionados foram excluídos.',
      });
    }

    if (req.method === 'PATCH') {
      const { id, active, adminActive, commissionRate, password } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID obrigatório.' });
      const patch = {};
      if (typeof active === 'boolean') patch.active = active;
      if (typeof adminActive === 'boolean') patch.admin_active = adminActive;
      if (commissionRate != null) patch.commission_rate = Number(commissionRate);
      const wantsPasswordChange = typeof password === 'string' && password.length > 0;
      if (wantsPasswordChange && password.length < 8) return json(res, 400, { error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
      if (!Object.keys(patch).length && !wantsPasswordChange) return json(res, 400, { error: 'Nenhuma alteração informada.' });

      const current = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(id)}&select=id,auth_user_id&limit=1`);
      if (!current?.[0]) return json(res, 404, { error: 'Afiliada não encontrada.' });

      let rows = [];
      if (Object.keys(patch).length) {
        rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
          body: JSON.stringify(patch),
        });
      }

      if (wantsPasswordChange) {
        await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(current[0].auth_user_id)}`, {
          method: 'PUT',
          body: JSON.stringify({ password }),
        });
      }

      return json(res, 200, { affiliate: rows?.[0] || current[0], passwordUpdated: wantsPasswordChange });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no painel administrativo.' });
  }
};

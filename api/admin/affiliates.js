const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { commissionForOrders, isPaidOrder, DEFAULT_COMMISSION_CONFIG, normalizeConfig } = require('../_lib/affiliateCommission');

function json(res, status, body) { res.status(status).json(body); }
function money(value) { return Math.round((Number(value) || 0) * 100) / 100; }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const [affiliates, orders, withdrawals, settingRows] = await Promise.all([
        supabaseFetch('/rest/v1/affiliates?select=id,slug,name,email,whatsapp,pix_key,active,admin_active,commission_rate,created_at&order=created_at.desc'),
        supabaseFetch('/rest/v1/affiliate_orders?select=affiliate_id,status,total,commission,created_at&order=created_at.desc&limit=20000'),
        supabaseFetch('/rest/v1/affiliate_withdrawals?select=affiliate_id,amount,status,requested_at&order=requested_at.desc&limit=10000'),
        supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,commission_none,commission_bronze,commission_silver,commission_gold&limit=1'),
      ]);

      const settings = normalizeConfig(settingRows?.[0] ? {
        ticketThreshold: settingRows[0].ticket_threshold,
        ticketBonus: settingRows[0].ticket_bonus,
        commissions: {
          none: settingRows[0].commission_none,
          bronze: settingRows[0].commission_bronze,
          silver: settingRows[0].commission_silver,
          gold: settingRows[0].commission_gold,
        },
      } : DEFAULT_COMMISSION_CONFIG);

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
        const commissionData = commissionForOrders(affiliateOrders, settings);
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

      return json(res, 200, { affiliates: result, settings });
    }

    if (req.method === 'DELETE') {
      const { ids, confirmPhrase, confirmCount } = req.body || {};
      const affiliateIds = Array.from(new Set((Array.isArray(ids) ? ids : [ids])
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0)));

      if (!affiliateIds.length) return json(res, 400, { error: 'Selecione pelo menos uma afiliada.' });
      if (String(confirmPhrase || '') !== 'EXCLUIR') return json(res, 400, { error: 'Confirmação final inválida.' });
      if (Number(confirmCount) !== affiliateIds.length) return json(res, 400, { error: 'A quantidade confirmada não corresponde às afiliadas selecionadas.' });

      const filter = affiliateIds.join(',');
      const current = await supabaseFetch(
        `/rest/v1/affiliates?id=in.(${filter})&select=id,auth_user_id,name,slug,email&limit=${affiliateIds.length}`
      );
      if ((current || []).length !== affiliateIds.length) {
        return json(res, 404, { error: 'Uma ou mais afiliadas selecionadas não foram encontradas.' });
      }

      const failed = [];

      for (const affiliate of current || []) {
        try {
          await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' },
          });
        } catch (error) {
          failed.push({ id: Number(affiliate.id), name: affiliate.name, error: error.message });
          continue;
        }

        if (affiliate.auth_user_id) {
          try {
            await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(affiliate.auth_user_id)}`, {
              method: 'DELETE',
            });
          } catch (error) {
            failed.push({
              id: Number(affiliate.id),
              name: affiliate.name,
              error: 'Dados SQL excluídos, mas a conta de autenticação não pôde ser removida.',
              partial: true,
            });
          }
        }
      }

      if (failed.length) {
        return json(res, 500, {
          error: `${failed.length} afiliada(s) tiveram problema durante a exclusão.`,
          failed,
          deletedCount: affiliateIds.length - failed.filter(item => !item.partial).length,
        });
      }

      return json(res, 200, {
        deleted: true,
        affiliateIds,
        message: `${affiliateIds.length} afiliada(s), contas de autenticação e registros relacionados foram excluídos.`,
      });
    }

    if (req.method === 'PATCH') {
      const { id, active, adminActive, commissionRate, password, settings: requestedSettings } = req.body || {};

      if (requestedSettings) {
        const currentRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,commission_none,commission_bronze,commission_silver,commission_gold&limit=1');
        const currentSettings = normalizeConfig(currentRows?.[0] ? {
          ticketThreshold: currentRows[0].ticket_threshold,
          ticketBonus: currentRows[0].ticket_bonus,
          commissions: { none: currentRows[0].commission_none, bronze: currentRows[0].commission_bronze, silver: currentRows[0].commission_silver, gold: currentRows[0].commission_gold },
        } : DEFAULT_COMMISSION_CONFIG);
        const nextSettings = normalizeConfig({
          ticketThreshold: requestedSettings.ticketThreshold,
          ticketBonus: currentSettings.ticketBonus,
          commissions: requestedSettings.commissions,
        });
        if (nextSettings.ticketThreshold <= 0 || Object.values(nextSettings.commissions).some(value => value < 0)) {
          return json(res, 400, { error: 'Os valores precisam ser válidos. A meta de ticket deve ser maior que zero e as comissões não podem ser negativas.' });
        }
        const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1', {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            ticket_threshold: nextSettings.ticketThreshold,
            commission_none: nextSettings.commissions.none,
            commission_bronze: nextSettings.commissions.bronze,
            commission_silver: nextSettings.commissions.silver,
            commission_gold: nextSettings.commissions.gold,
          }),
        });
        return json(res, 200, { settings: nextSettings, row: rows?.[0] || null });
      }

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

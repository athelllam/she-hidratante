const { requireAffiliate, json, supabaseFetch } = require('../_lib/supabase');
const { syncAffiliateOrders, getConfig } = require('../_lib/yampi');
const { CART_TOKENS, loadPrices } = require('../_lib/cartPrices');

module.exports = async function handler(req, res) {
  // O GET de preços usa esta função já existente para não criar uma nova
  // Serverless Function. Ele é público, mas aceita somente os tokens dos
  // produtos que realmente aparecem nos carrinhos. Nenhuma credencial Yampi
  // é exposta ao navegador.
  if (req.method === 'GET' && String(req.query?.prices || '') === '1') {
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');

    const tokens = String(req.query?.tokens || '')
      .split(',')
      .map((token) => String(token || '').trim().toUpperCase())
      .filter((token) => CART_TOKENS.has(token))
      .slice(0, CART_TOKENS.size);

    if (!tokens.length) {
      return json(res, 400, { ok: false, error: 'Nenhum produto do carrinho informado.' });
    }

    try {
      const prices = await loadPrices(tokens);
      const missing = tokens.filter((token) => !prices[token]);

      if (missing.length) {
        return json(res, 502, {
          ok: false,
          error: 'Não foi possível localizar todos os produtos do carrinho na Yampi.',
          missing,
          prices,
        });
      }

      return json(res, 200, { ok: true, source: 'yampi', prices });
    } catch (error) {
      console.error('[She Prices] Falha ao sincronizar preços Yampi:', error);
      return json(res, Number(error?.statusCode) || 502, {
        ok: false,
        error: error?.message || 'Falha ao consultar os preços na Yampi.',
      });
    }
  }

  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliate } = await requireAffiliate(req);
    const config = getConfig();

    if (!config.configured) {
      return json(res, 200, {
        ok: false,
        configured: false,
        message: 'Integração Yampi ainda não configurada no Vercel.',
      });
    }

    const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales&limit=1');
    const setting = settingRows?.[0] || {};
    const commissionConfig = {
      ticketThreshold: setting.ticket_threshold,
      ticketBonus: setting.ticket_bonus,
      teamCommissionPerSale: setting.team_commission_per_sale,
      commissions: { none: setting.commission_none, bronze: setting.commission_bronze, silver: setting.commission_silver, gold: setting.commission_gold },
      monthlyLevels: { bronze: setting.monthly_bronze_sales, silver: setting.monthly_silver_sales, gold: setting.monthly_gold_sales },
      fixedLevels: { bronze: setting.fixed_bronze_sales, silver: setting.fixed_silver_sales, gold: setting.fixed_gold_sales },
    };
    const result = await syncAffiliateOrders(affiliate.id, affiliate.commission_rate, commissionConfig, affiliate.team_joined_at);
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      ok: false,
      error: error.message || 'Não foi possível sincronizar a Yampi.',
    });
  }
};

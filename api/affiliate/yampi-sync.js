const { requireAffiliate, json } = require('../_lib/supabase');
const { syncAffiliateOrders, getConfig } = require('../_lib/yampi');

module.exports = async function handler(req, res) {
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

    const result = await syncAffiliateOrders(affiliate.id, affiliate.commission_rate);
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      ok: false,
      error: error.message || 'Não foi possível sincronizar a Yampi.',
    });
  }
};

const { requireAffiliate, json } = require('../_lib/supabase');
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

    const result = await syncAffiliateOrders(affiliate.id, affiliate.commission_rate);
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      ok: false,
      error: error.message || 'Não foi possível sincronizar a Yampi.',
    });
  }
};

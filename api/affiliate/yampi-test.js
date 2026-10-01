const { requireAffiliate, json } = require('../_lib/supabase');
const { getConfig, yampiFetch, getMetadata, getOrderId, getStatus, getTotal, getCreatedAt } = require('../_lib/yampi');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliate } = await requireAffiliate(req);
    const config = getConfig();

    if (!config.configured) {
      return json(res, 200, { ok: false, configured: false, message: 'Integração Yampi ainda não configurada no Vercel.' });
    }

    const response = await yampiFetch('/orders?limit=5');
    const orders = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : []);

    return json(res, 200, {
      ok: true,
      configured: true,
      authenticated: true,
      alias: config.alias || null,
      ordersReturned: orders.length,
      currentAffiliateId: affiliate.id,
      latestOrders: orders.slice(0, 5).map((order) => ({
        id: getOrderId(order),
        status: getStatus(order),
        total: getTotal(order),
        createdAt: getCreatedAt(order),
        affiliateId: getMetadata(order, 'affiliate_id'),
      })),
      note: 'Consulta somente leitura. Não cria pedido e não dispara webhook.',
    });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      ok: false,
      configured: true,
      authenticated: false,
      error: error.message || 'Não foi possível consultar a API da Yampi.',
    });
  }
};

const { requireAffiliate, json } = require('../_lib/supabase');
const {
  syncAffiliateOrders,
  getConfig,
  yampiFetch,
  getMetadata,
  getOrderId,
  getStatus,
  getTotal,
  getCreatedAt,
} = require('../_lib/yampi');

module.exports = async function handler(req, res) {
  // GET = diagnóstico somente leitura da API Yampi.
  // POST = sincronização dos pedidos atribuídos à afiliada.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'Método não permitido.' });
  }

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

    if (req.method === 'GET') {
      const response = await yampiFetch('/orders?limit=5');
      const orders = Array.isArray(response)
        ? response
        : (Array.isArray(response?.data) ? response.data : []);

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
    }

    const result = await syncAffiliateOrders(affiliate.id, affiliate.commission_rate);
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    return json(res, error.statusCode || 500, {
      ok: false,
      configured: true,
      authenticated: req.method === 'GET' ? false : undefined,
      error: error.message || 'Não foi possível consultar/sincronizar a Yampi.',
    });
  }
};

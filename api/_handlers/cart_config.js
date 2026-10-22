const { supabaseFetch, json } = require('../_lib/supabase');
const { loadPrices } = require('../_lib/cartPrices');
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  const slug = String(req.query?.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
  if (!slug) return json(res, 400, { error: 'Slug da página ausente.' });
  try {
    const pages = await supabaseFetch(`/rest/v1/she_cart_pages?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);
    if (!pages?.[0]) return json(res, 404, { error: 'Configuração de carrinho não encontrada.' });
    const page = pages[0];
    const mappings = await supabaseFetch(`/rest/v1/she_cart_page_products?page_id=eq.${encodeURIComponent(page.id)}&active=eq.true&select=product_id,role,position&order=position.asc`);
    const ids = [...new Set((mappings || []).map(item => item.product_id))];
    const products = ids.length ? await supabaseFetch(`/rest/v1/she_cart_products?id=in.(${ids.map(encodeURIComponent).join(',')})&active=eq.true&select=*`) : [];
    const byId = new Map((products || []).map(product => [String(product.id), product]));
    const tokens = [...new Set((mappings || []).map(item => byId.get(String(item.product_id))?.yampi_token).filter(Boolean))];
    let prices = {};
    try { prices = await loadPrices(tokens); } catch (error) { console.error('[She Cart Config] Yampi prices error', error.message); }
    const configured = (mappings || []).map(item => {
      const product = byId.get(String(item.product_id));
      return product ? { ...product, role: item.role, position: item.position, price: prices[product.yampi_token] || null } : null;
    }).filter(Boolean);
    return json(res, 200, { ok: true, page, products: configured });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível carregar o carrinho.' });
  }
};

const { requireAdmin, supabaseFetch, json } = require('../_lib/supabase');
const { loadPrices } = require('../_lib/cartPrices');

const PRODUCTS = '/rest/v1/she_cart_products';
const PAGES = '/rest/v1/she_cart_pages';
const ITEMS = '/rest/v1/she_cart_page_products';
const safeToken = value => String(value || '').trim().toUpperCase();
const slugify = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

async function uploadImage(dataUrl, filename) {
  if (!dataUrl) return null;
  const match = String(dataUrl).match(/^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/);
  if (!match) { const e = new Error('Envie uma imagem WebP válida.'); e.statusCode = 400; throw e; }
  const bytes = Buffer.from(match[1], 'base64');
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) { const e = new Error('A imagem deve ter até 3 MB.'); e.statusCode = 400; throw e; }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { const e = new Error('Supabase não configurado.'); e.statusCode = 500; throw e; }
  const safeName = `${Date.now()}-${slugify(filename || 'produto')}.webp`;
  const response = await fetch(`${url}/storage/v1/object/she-product-images/${safeName}`, {
    method: 'POST', headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: bytes,
  });
  if (!response.ok) { const detail = await response.text().catch(() => ''); const e = new Error(`Falha no upload da imagem. Confira o bucket she-product-images no Supabase. ${detail.slice(0, 160)}`); e.statusCode = 502; throw e; }
  return `${url}/storage/v1/object/public/she-product-images/${safeName}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await requireAdmin(req);
    if (req.method === 'GET') {
      const [products, pages, mappings] = await Promise.all([
        supabaseFetch(`${PRODUCTS}?select=*&order=name.asc`),
        supabaseFetch(`${PAGES}?select=*&order=name.asc`),
        supabaseFetch(`${ITEMS}?select=*&order=position.asc`),
      ]);
      return json(res, 200, { ok: true, products: products || [], pages: pages || [], mappings: mappings || [] });
    }
    if (req.method === 'POST') {
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const token = safeToken(body.yampi_token);
      const description = String(body.description || '').trim();
      if (!name || name.length > 120) return json(res, 400, { error: 'Informe um nome com até 120 caracteres.' });
      if (!/^[A-Z0-9_-]{5,50}$/.test(token)) return json(res, 400, { error: 'Informe um ID/token Yampi válido (5 a 50 caracteres, letras e números).' });
      if (description.length > 500) return json(res, 400, { error: 'A descrição deve ter até 500 caracteres.' });
      const duplicate = await supabaseFetch(`${PRODUCTS}?yampi_token=eq.${encodeURIComponent(token)}&select=id&limit=1`);
      if (duplicate?.[0] && String(duplicate[0].id) !== String(body.id || '')) return json(res, 409, { error: 'Esse ID Yampi já está cadastrado em outro produto.' });
      let image_url = body.image_url || null;
      if (body.image_data) image_url = await uploadImage(body.image_data, body.image_filename || name);
      const payload = { name, description, yampi_token: token, image_url, active: body.active !== false, updated_at: new Date().toISOString() };
      let saved;
      if (body.id) {
        saved = await supabaseFetch(`${PRODUCTS}?id=eq.${encodeURIComponent(body.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      } else {
        payload.created_at = new Date().toISOString();
        saved = await supabaseFetch(PRODUCTS, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      }
      const product = saved?.[0];
      if (!product) return json(res, 500, { error: 'Não foi possível salvar o produto.' });
      let price = null;
      try { price = (await loadPrices([token]))[token] || null; } catch (error) { return json(res, 200, { ok: true, product, price: null, priceWarning: `Produto salvo, mas a consulta de preço falhou: ${error.message}` }); }
      return json(res, 200, { ok: true, product, price, priceWarning: price ? null : 'Produto salvo, mas o ID não foi encontrado no catálogo de preços da Yampi. Confira se o token informado é o token de checkout/SKU correto.' });
    }
    if (req.method === 'PUT') {
      const body = req.body || {};
      const pageId = String(body.page_id || '');
      const pageName = String(body.page_name || '').trim();
      const pageSlug = slugify(body.page_slug || pageName);
      if (!pageName || !pageSlug) return json(res, 400, { error: 'Informe o nome e o slug da página.' });
      let pageRows;
      if (pageId) {
        pageRows = await supabaseFetch(`${PAGES}?id=eq.${encodeURIComponent(pageId)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: pageName, slug: pageSlug, updated_at: new Date().toISOString() }) });
      } else {
        pageRows = await supabaseFetch(PAGES, { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: pageName, slug: pageSlug, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      }
      const page = pageRows?.[0];
      if (!page) return json(res, 500, { error: 'Não foi possível salvar a página.' });
      const selections = Array.isArray(body.products) ? body.products : [];
      await supabaseFetch(`${ITEMS}?page_id=eq.${encodeURIComponent(page.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (selections.length) {
        const rows = selections.filter(item => item?.product_id && ['main', 'upsell'].includes(item.role)).map((item, index) => ({ page_id: page.id, product_id: item.product_id, role: item.role, position: index, active: item.active !== false }));
        if (rows.length) await supabaseFetch(ITEMS, { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(rows) });
      }
      return json(res, 200, { ok: true, page });
    }
    if (req.method === 'DELETE') {
      const id = String(req.query?.id || req.body?.id || '');
      if (!id) return json(res, 400, { error: 'ID do produto ausente.' });
      await supabaseFetch(`${ITEMS}?product_id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      await supabaseFetch(`${PRODUCTS}?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return json(res, 200, { ok: true });
    }
    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Falha ao administrar produtos.' });
  }
};

const { supabaseFetch, json } = require('../../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const slug = String(req.query?.slug || '').toLowerCase();
    if (!slug) return json(res, 400, { error: 'Slug obrigatório.' });
    const rows = await supabaseFetch(`/rest/v1/affiliates?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=id,slug,name,active,commission_rate&limit=1`);
    if (!rows?.[0]) return json(res, 404, { error: 'Afiliada não encontrada.' });
    return json(res, 200, { affiliate: rows[0] });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro.' });
  }
};

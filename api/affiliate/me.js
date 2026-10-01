const { requireAffiliate, json } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const { affiliate } = await requireAffiliate(req);
    return json(res, 200, { affiliate });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não autenticada.' });
  }
};

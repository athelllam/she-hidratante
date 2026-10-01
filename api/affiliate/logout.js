const { clearAuthCookie, json } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  clearAuthCookie(res);
  return json(res, 200, { ok: true });
};

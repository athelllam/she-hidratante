const { authFetch, supabaseFetch, setAuthCookie, json } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { email, password } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !password) return json(res, 400, { error: 'Informe e-mail e senha.' });

    const session = await authFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    const rows = await supabaseFetch(
      `/rest/v1/affiliates?auth_user_id=eq.${encodeURIComponent(session.user.id)}&select=id,slug,name,email,active,commission_rate,created_at&limit=1`
    );
    if (!rows?.[0] || !rows[0].active) return json(res, 403, { error: 'Conta de afiliada inativa ou não encontrada.' });

    setAuthCookie(res, session.access_token);
    return json(res, 200, { affiliate: rows[0] });
  } catch (error) {
    return json(res, error.statusCode === 400 ? 401 : (error.statusCode || 500), { error: error.message || 'Não foi possível entrar.' });
  }
};

const crypto = require('crypto');
const { json } = require('../_lib/supabase');
const {
  createSession,
  setAdminCookie,
  clearAdminCookie,
  getAdminCredentials,
} = require('../_lib/admin');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || ''), 'utf8').digest('hex').toLowerCase();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    if (req.body?.action === 'logout') {
      clearAdminCookie(res);
      return json(res, 200, { ok: true });
    }

    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    const credentials = await getAdminCredentials();

    if (!username || !password) return json(res, 400, { error: 'Informe login e senha.' });

    const validLogin = username === credentials.loginEmail || username === credentials.loginUsername || (!credentials.databaseConfigured && (username === credentials.login || username === 'athelllam'));
    const valid = validLogin && hashPassword(password) === credentials.passwordSha256;
    if (!valid) return json(res, 401, { error: 'Login ou senha incorretos.' });

    setAdminCookie(res, createSession(credentials.loginEmail));
    return json(res, 200, { ok: true, admin: { username: credentials.loginUsername, email: credentials.loginEmail } });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível entrar.' });
  }
};

const { getCookie, getAuthUser, supabaseFetch } = require('./supabase');

async function requireAdmin(req) {
  const token = getCookie(req, 'she_affiliate_session');
  const user = await getAuthUser(token);
  if (!user) {
    const err = new Error('Não autenticado.'); err.statusCode = 401; throw err;
  }
  const allowed = String(process.env.ADMIN_EMAILS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(String(user.email || '').toLowerCase())) {
    const err = new Error('Acesso administrativo negado.'); err.statusCode = 403; throw err;
  }
  return user;
}

module.exports = { requireAdmin, supabaseFetch };

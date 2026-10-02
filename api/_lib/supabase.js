const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
    const err = new Error('Backend environment variables are not configured.');
    err.statusCode = 500;
    throw err;
  }
}

async function supabaseFetch(path, options = {}) {
  assertEnv();
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.msg || data?.error_description || `Supabase HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function authFetch(path, options = {}) {
  assertEnv();
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const response = await fetch(`${SUPABASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.msg || data?.error_description || data?.message || `Auth HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function getAuthUser(accessToken) {
  if (!accessToken) return null;
  assertEnv();
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

function getCookie(request, name) {
  const raw = request.headers.cookie || '';
  const parts = raw.split(';').map((part) => part.trim());
  const item = parts.find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function setAuthCookie(response, accessToken, maxAge = 60 * 60 * 24 * 30) {
  response.setHeader('Set-Cookie', [
     `she_affiliate_session=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${maxAge}`.trim(),
  ]);
}

function clearAuthCookie(response) {
  response.setHeader('Set-Cookie', [
    `she_affiliate_session=; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`,
  ]);
}

function json(response, status, body) {
  response.status(status).json(body);
}

async function requireAffiliate(request) {
  const token = getCookie(request, 'she_affiliate_session');
  const user = await getAuthUser(token);
  if (!user) {
    const err = new Error('Não autenticada.');
    err.statusCode = 401;
    throw err;
  }

  const rows = await supabaseFetch(
    `/rest/v1/affiliates?auth_user_id=eq.${encodeURIComponent(user.id)}&select=id,slug,name,email,whatsapp,pix_key,active,commission_rate,created_at&limit=1`
  );

  if (!rows?.[0]) {
    const err = new Error('Afiliada não encontrada.');
    err.statusCode = 403;
    throw err;
  }

  return { user, affiliate: rows[0], token };
}

module.exports = {
  supabaseFetch,
  authFetch,
  getAuthUser,
  getCookie,
  setAuthCookie,
  clearAuthCookie,
  json,
  requireAffiliate,
};

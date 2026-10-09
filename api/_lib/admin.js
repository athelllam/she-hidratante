const crypto = require('crypto');
const { supabaseFetch } = require('./supabase');

const DEFAULT_ADMIN_LOGIN = 'athelllam@gmail.com';
const DEFAULT_ADMIN_USERNAME = 'athelllam';
const DEFAULT_ADMIN_PASSWORD_SHA256 = '88848b5126f436cdbf6ad2036bad5d68f08ab48df111806ab6bf324ebe4613d8';
const SESSION_COOKIE = 'she_admin_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

function getSessionSecret() {
  const secret = String(process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!secret) {
    const err = new Error('ADMIN_SESSION_SECRET não configurado.');
    err.statusCode = 500;
    throw err;
  }
  return secret;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function createSession(username) {
  const payload = base64url(JSON.stringify({
    username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  }));
  return `${payload}.${sign(payload)}`;
}

function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const aa = Buffer.from(signature);
  const bb = Buffer.from(expected);
  if (aa.length !== bb.length || !crypto.timingSafeEqual(aa, bb)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data?.username || Number(data.exp) < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function getCookie(request, name) {
  const raw = request.headers.cookie || '';
  const parts = raw.split(';').map(part => part.trim());
  const item = parts.find(part => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

function setAdminCookie(response, token) {
  response.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`,
  ]);
}

function clearAdminCookie(response) {
  response.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=; Path=/; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`,
  ]);
}

async function requireAdmin(req) {
  const session = verifySession(getCookie(req, SESSION_COOKIE));
  if (!session) {
    const err = new Error('Não autenticado.');
    err.statusCode = 401;
    throw err;
  }
  return session;
}

function envAdminCredentials() {
  const configuredLogin = String(process.env.ADMIN_LOGIN || DEFAULT_ADMIN_LOGIN).trim();
  const loginEmail = String(process.env.ADMIN_EMAIL || (configuredLogin.includes('@') ? configuredLogin : DEFAULT_ADMIN_LOGIN)).trim().toLowerCase();
  const loginUsername = String(process.env.ADMIN_USERNAME || (!configuredLogin.includes('@') ? configuredLogin : DEFAULT_ADMIN_USERNAME)).trim();
  return {
    login: configuredLogin,
    loginUsername,
    loginEmail,
    passwordSha256: String(process.env.ADMIN_PASSWORD_SHA256 || DEFAULT_ADMIN_PASSWORD_SHA256).trim().toLowerCase(),
    databaseConfigured: false,
    notificationEmails: String(process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean),
  };
}

function isMissingAdminProfileTable(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.data?.code || '').toUpperCase();
  return error?.statusCode === 404 || code === 'PGRST205' || message.includes('admin_profile_settings') && (message.includes('not find') || message.includes('does not exist') || message.includes('schema cache'));
}

async function readAdminProfileRow() {
  try {
    const rows = await supabaseFetch('/rest/v1/admin_profile_settings?id=eq.1&select=id,login_username,login_email,password_sha256,notification_emails,updated_at&limit=1');
    return rows?.[0] || null;
  } catch (error) {
    if (isMissingAdminProfileTable(error)) return null;
    throw error;
  }
}

async function getAdminCredentials() {
  const defaults = envAdminCredentials();
  const row = await readAdminProfileRow();
  if (!row) return defaults;
  const savedNotificationEmails = Array.isArray(row.notification_emails)
    ? [...new Set(row.notification_emails.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))]
    : [];
  return {
    login: String(row.login_email || defaults.loginEmail).trim().toLowerCase(),
    loginUsername: String(row.login_username || defaults.loginUsername).trim(),
    loginEmail: String(row.login_email || defaults.loginEmail).trim().toLowerCase(),
    passwordSha256: String(row.password_sha256 || defaults.passwordSha256).trim().toLowerCase(),
    databaseConfigured: true,
    // When settings have not been configured yet (or the saved array is empty),
    // seed the panel with ADMIN_EMAILS instead of presenting a blank recipient list.
    notificationEmails: savedNotificationEmails.length ? savedNotificationEmails : defaults.notificationEmails,
  };
}

module.exports = {
  requireAdmin,
  supabaseFetch,
  createSession,
  setAdminCookie,
  clearAdminCookie,
  getAdminCredentials,
  readAdminProfileRow,
};

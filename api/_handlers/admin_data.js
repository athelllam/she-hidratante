const crypto = require('crypto');
const { json } = require('../_lib/supabase');
const { requireAdmin, supabaseFetch, getAdminCredentials, readAdminProfileRow } = require('../_lib/admin');

function hashPassword(password) {
  return crypto.createHash('sha256').update(String(password || ''), 'utf8').digest('hex').toLowerCase();
}

function sameHash(left, right) {
  const a = Buffer.from(String(left || ''), 'hex');
  const b = Buffer.from(String(right || ''), 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizeEmails(values) {
  const items = Array.isArray(values) ? values : [];
  return [...new Set(items.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const credentials = await getAdminCredentials();
      return json(res, 200, {
        loginUsername: credentials.loginUsername,
        loginEmail: credentials.loginEmail,
        notificationEmails: credentials.notificationEmails || [],
        passwordConfigured: Boolean(credentials.passwordSha256),
        passwordIsVisible: false,
      });
    }

    if (req.method !== 'PATCH' && req.method !== 'PUT') {
      return json(res, 405, { error: 'Método não permitido.' });
    }

    const credentials = await getAdminCredentials();
    const body = req.body || {};
    const loginUsername = String(body.loginUsername ?? credentials.loginUsername).trim();
    const loginEmail = String(body.loginEmail ?? credentials.loginEmail).trim().toLowerCase();
    const notificationEmails = normalizeEmails(body.notificationEmails);
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');

    if (!loginUsername || loginUsername.length < 3 || loginUsername.length > 80 || /\s/.test(loginUsername)) {
      return json(res, 400, { error: 'O login deve ter entre 3 e 80 caracteres e não pode conter espaços.' });
    }
    if (!validEmail(loginEmail)) return json(res, 400, { error: 'Informe um e-mail de login válido.' });
    if (!notificationEmails.length) return json(res, 400, { error: 'Informe ao menos um e-mail de notificação.' });
    if (notificationEmails.length > 20) return json(res, 400, { error: 'É possível cadastrar até 20 e-mails de notificação.' });
    if (notificationEmails.some(value => !validEmail(value))) return json(res, 400, { error: 'Um ou mais e-mails de notificação são inválidos.' });

    const profileChanged = loginUsername !== credentials.loginUsername || loginEmail !== credentials.loginEmail || Boolean(newPassword);
    if (profileChanged && !sameHash(hashPassword(currentPassword), credentials.passwordSha256)) {
      return json(res, 401, { error: 'Informe a senha atual correta para alterar o login, o e-mail de login ou a senha.' });
    }
    if (newPassword && newPassword.length < 10) {
      return json(res, 400, { error: 'A nova senha deve ter pelo menos 10 caracteres.' });
    }

    const previousRow = await readAdminProfileRow();
    const passwordSha256 = newPassword ? hashPassword(newPassword) : credentials.passwordSha256;
    const payload = {
      id: 1,
      login_username: loginUsername,
      login_email: loginEmail,
      password_sha256: passwordSha256,
      notification_emails: notificationEmails,
      updated_at: new Date().toISOString(),
    };
    const saved = await supabaseFetch('/rest/v1/admin_profile_settings?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(payload),
    });
    const row = saved?.[0] || payload;

    return json(res, 200, {
      ok: true,
      loginUsername: row.login_username,
      loginEmail: row.login_email,
      notificationEmails: row.notification_emails || [],
      passwordConfigured: true,
      passwordChanged: Boolean(newPassword),
      profileChanged: loginUsername !== credentials.loginUsername || loginEmail !== credentials.loginEmail,
      previousSettingsExisted: Boolean(previousRow),
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível carregar ou salvar os dados do administrador.' });
  }
};

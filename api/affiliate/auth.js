const { authFetch, supabaseFetch, setAuthCookie, clearAuthCookie, json } = require('../_lib/supabase');
const crypto = require('crypto');
const { sendEmail, resetPasswordEmail } = require('../_lib/email');

function normalizeCpf(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidCpf(value) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  if (digit !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  digit = (sum * 10) % 11;
  if (digit === 10) digit = 0;
  return digit === Number(cpf[10]);
}

function normalizeWhatsapp(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 50);
}

async function login(req, res) {
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
}



async function forgotPassword(req, res) {
  const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return json(res, 400, { error: 'Informe um e-mail válido.' });
  }

  const affiliates = await supabaseFetch(
    `/rest/v1/affiliates?email=eq.${encodeURIComponent(cleanEmail)}&select=id,name,email,auth_user_id,active&limit=1`
  );

  // Resposta genérica para não revelar se o e-mail está cadastrado.
  if (affiliates?.[0]?.active) {
    const affiliate = affiliates[0];
    const baseUrl = String(process.env.SITE_URL || process.env.APP_BASE_URL || '').replace(/\/$/, '');
    if (!baseUrl) {
      const error = new Error('SITE_URL não configurada no ambiente.');
      error.statusCode = 500;
      throw error;
    }

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await supabaseFetch(`/rest/v1/affiliate_password_reset_tokens?affiliate_id=eq.${Number(affiliate.id)}&used_at=is.null`, {
      method: 'DELETE',
    });

    await supabaseFetch('/rest/v1/affiliate_password_reset_tokens', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        affiliate_id: affiliate.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      }),
    });

    const actionLink = `${baseUrl}/afiliado/redefinir-senha/${encodeURIComponent(token)}`;
    const result = await sendEmail({
      to: affiliate.email,
      subject: 'Redefina sua senha — She Afiliadas',
      html: resetPasswordEmail({ name: affiliate.name, actionLink }),
      tags: [{ name: 'category', value: 'password-reset' }],
    });

    if (result?.skipped) {
      const error = new Error('Serviço de e-mail não configurado.');
      error.statusCode = 503;
      throw error;
    }
  }

  return json(res, 200, { ok: true, message: 'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.' });
}

async function resetPassword(req, res) {
  const token = String(req.body?.token || '').trim();
  const password = String(req.body?.password || '');
  if (!token) return json(res, 400, { error: 'Link de redefinição inválido ou expirado.' });
  if (password.length < 8) return json(res, 400, { error: 'A nova senha precisa ter pelo menos 8 caracteres.' });

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenRows = await supabaseFetch(
    `/rest/v1/affiliate_password_reset_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&used_at=is.null&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=id,affiliate_id,expires_at&limit=1`
  );
  const reset = tokenRows?.[0];
  if (!reset) return json(res, 400, { error: 'Link de redefinição inválido ou expirado. Solicite um novo link.' });

  const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(reset.affiliate_id)}&select=id,auth_user_id,active&limit=1`);
  const affiliate = affiliates?.[0];
  if (!affiliate?.active || !affiliate.auth_user_id) {
    return json(res, 400, { error: 'Não foi possível redefinir esta conta.' });
  }

  await supabaseFetch(`/auth/v1/admin/users/${encodeURIComponent(affiliate.auth_user_id)}`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });

  await supabaseFetch(`/rest/v1/affiliate_password_reset_tokens?affiliate_id=eq.${Number(reset.affiliate_id)}&used_at=is.null`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ used_at: new Date().toISOString() }),
  });

  return json(res, 200, { ok: true });
}

async function register(req, res) {
  const { name, slug, email, password, whatsapp, cpf } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanSlug = slugify(slug || name).slice(0, 44);
  const cleanWhatsapp = normalizeWhatsapp(whatsapp);
  const cleanCpf = normalizeCpf(cpf);

  if (!cleanName || !cleanEmail || !cleanWhatsapp || !isValidCpf(cleanCpf) || String(password || '').length < 8) {
    return json(res, 400, { error: 'Informe nome, CPF válido, WhatsApp, e-mail e senha com pelo menos 8 caracteres.' });
  }

  const existing = await supabaseFetch(
    `/rest/v1/affiliates?or=(email.eq.${encodeURIComponent(cleanEmail)},cpf.eq.${encodeURIComponent(cleanCpf)})&select=id,slug,email,cpf&limit=1`
  );
  if (existing?.length) {
    const duplicate = existing[0];
    if (duplicate.cpf === cleanCpf) return json(res, 409, { error: 'Este CPF já está cadastrado.' });
    return json(res, 409, { error: 'E-mail já cadastrado.' });
  }

  const created = await supabaseFetch('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'affiliate', name: cleanName },
    }),
  });

  try {
    const rows = await supabaseFetch('/rest/v1/affiliates', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        auth_user_id: created.id,
        name: cleanName,
        slug: null,
        email: cleanEmail,
        cpf: cleanCpf,
        whatsapp: cleanWhatsapp,
        pix_key: null,
        active: true,
        admin_active: true,
        commission_rate: 0.10,
      }),
    });

    if (rows?.[0]?.id) {
      await supabaseFetch('/rest/v1/affiliate_admin_status_history', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ affiliate_id: rows[0].id, admin_active: true }),
      }).catch(() => null);
    }

    const session = await authFetch('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, password }),
    });

    setAuthCookie(res, session.access_token);
    return json(res, 201, { affiliate: rows[0], user: { id: created.id, email: cleanEmail } });
  } catch (error) {
    try {
      await supabaseFetch(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' });
    } catch {}
    throw error;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  const action = String(req.query?.action || 'login').toLowerCase();
  try {
    if (action === 'logout') {
      clearAuthCookie(res);
      return json(res, 200, { ok: true });
    }
    if (action === 'register') return await register(req, res);
    if (action === 'forgot') return await forgotPassword(req, res);
    if (action === 'reset') return await resetPassword(req, res);
    return await login(req, res);
  } catch (error) {
    return json(res, error.statusCode === 400 ? 401 : (error.statusCode || 500), {
      error: error.message || (action === 'register' ? 'Erro ao criar afiliada.' : 'Não foi possível entrar.'),
    });
  }
};

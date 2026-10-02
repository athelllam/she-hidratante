const { authFetch, supabaseFetch, setAuthCookie, clearAuthCookie, json } = require('../_lib/supabase');

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

async function register(req, res) {
  const { name, slug, email, password, whatsapp, cpf } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanSlug = slugify(slug || name).slice(0, 44);
  const cleanWhatsapp = normalizeWhatsapp(whatsapp);
  const cleanCpf = normalizeCpf(cpf);

  if (!cleanName || !cleanSlug || !cleanEmail || !cleanWhatsapp || !isValidCpf(cleanCpf) || String(password || '').length < 8) {
    return json(res, 400, { error: 'Informe nome, CPF válido, slug, WhatsApp, e-mail e senha com pelo menos 8 caracteres.' });
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
        slug: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
      const affiliateId = Number(rows[0].id);
      const finalSlug = `${cleanSlug}${affiliateId}`.slice(0, 50);
      const updated = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ slug: finalSlug }),
      });
      rows[0] = updated?.[0] || { ...rows[0], slug: finalSlug };

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
    return await login(req, res);
  } catch (error) {
    return json(res, error.statusCode === 400 ? 401 : (error.statusCode || 500), {
      error: error.message || (action === 'register' ? 'Erro ao criar afiliada.' : 'Não foi possível entrar.'),
    });
  }
};

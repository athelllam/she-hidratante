const { supabaseFetch, authFetch, setAuthCookie, json } = require('../_lib/supabase');

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { name, slug, email, password, whatsapp } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanSlug = slugify(slug || name);
    const cleanWhatsapp = normalizeWhatsapp(whatsapp);

    if (!cleanName || !cleanSlug || !cleanEmail || !cleanWhatsapp || String(password || '').length < 8) {
      return json(res, 400, { error: 'Informe nome, slug, WhatsApp, e-mail e senha com pelo menos 8 caracteres.' });
    }

    const existing = await supabaseFetch(
      `/rest/v1/affiliates?or=(slug.eq.${encodeURIComponent(cleanSlug)},email.eq.${encodeURIComponent(cleanEmail)})&select=id,slug,email&limit=1`
    );
    if (existing?.length) return json(res, 409, { error: 'Slug ou e-mail já cadastrado.' });

    // Creates the Auth user with e-mail already confirmed, so the affiliate can log in immediately.
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
          slug: cleanSlug,
          email: cleanEmail,
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
      // Best-effort rollback if the affiliate row could not be created.
      try {
        await supabaseFetch(`/auth/v1/admin/users/${created.id}`, { method: 'DELETE' });
      } catch {}
      throw error;
    }
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao criar afiliada.' });
  }
};

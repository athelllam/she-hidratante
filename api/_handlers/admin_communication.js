const { supabaseFetch, json } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/admin');

function clean(value) { return String(value ?? '').trim(); }
function emailKey(value) { return clean(value).toLowerCase(); }
function phoneKey(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.startsWith('55') ? `+${digits}` : `+55${digits}`;
}
function mergeSource(current, incoming) {
  const values = new Set(String(current || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean));
  values.add(incoming);
  return ['formspree', 'yampi'].filter(value => values.has(value)).join(',') || 'unknown';
}

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);
    if (req.method === 'GET') {
      const contacts = await supabaseFetch('/rest/v1/communication_contacts?select=id,name,email,phone,source,created_at,email_marketing_consent,sms_marketing_consent,email_unsubscribed_at,sms_unsubscribed_at,consent_source,consent_recorded_at&order=created_at.desc&limit=2000');
      return json(res, 200, { contacts: contacts || [] });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
    const submissions = Array.isArray(req.body?.submissions) ? req.body.submissions.slice(0, 2000) : null;
    if (!submissions) return json(res, 400, { error: 'Lista de contatos inválida.' });

    let inserted = 0, updated = 0, duplicates = 0;
    for (const item of submissions) {
      const email = emailKey(item?.email);
      const phone = phoneKey(item?.telefone || item?.phone);
      const name = clean(item?.nome || item?.name);
      if (!email && !phone) { duplicates++; continue; }
      const query = email
        ? `/rest/v1/communication_contacts?email=eq.${encodeURIComponent(email)}&select=id,source,email_unsubscribed_at,sms_unsubscribed_at,consent_source,consent_recorded_at&limit=1`
        : `/rest/v1/communication_contacts?phone=eq.${encodeURIComponent(phone)}&select=id,source,email_unsubscribed_at,sms_unsubscribed_at,consent_source,consent_recorded_at&limit=1`;
      const existing = await supabaseFetch(query);
      const values = {
        name: name || null, email: email || null, phone: phone || null,
        source_submitted_at: item?._date || null,
        updated_at: new Date().toISOString(),
      };
      if (existing?.[0]?.id) {
        // A autorização foi confirmada pelo administrador. Não reativar contatos
        // que já tenham solicitado descadastro anteriormente.
        const current = existing[0];
        await supabaseFetch(`/rest/v1/communication_contacts?id=eq.${existing[0].id}`, {
          method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
            ...values,
            source: mergeSource(current.source, 'formspree'),
            email_marketing_consent: current.email_unsubscribed_at ? false : true,
            sms_marketing_consent: current.sms_unsubscribed_at ? false : true,
            consent_status: 'confirmed_by_admin',
            consent_source: current.consent_source || 'admin_confirmation_2026-11-17',
            consent_recorded_at: current.consent_recorded_at || new Date().toISOString(),
          }),
        });
        updated++;
      } else {
        try {
          await supabaseFetch('/rest/v1/communication_contacts', {
            method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
              ...values, source: 'formspree', email_marketing_consent: true, sms_marketing_consent: true,
              consent_status: 'confirmed_by_admin',
              consent_source: 'admin_confirmation_2026-11-17',
              consent_recorded_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }),
          });
          inserted++;
        } catch (error) {
          if (error.statusCode === 409 || error.statusCode === 400) duplicates++;
          else throw error;
        }
      }
    }
    return json(res, 200, { ok: true, inserted, updated, duplicates });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.statusCode === 401 ? 'Não autenticado como administrador.' : (error.message || 'Erro no painel de comunicação.') });
  }
};

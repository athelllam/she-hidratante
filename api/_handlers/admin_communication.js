const { supabaseFetch, json } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/admin');
const { sendBulkEmails } = require('../_lib/email');

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
    if (req.method === 'GET' && !['history', 'campaigns'].includes(String(req.query?.action || ''))) {
      const contacts = await supabaseFetch('/rest/v1/communication_contacts?select=id,name,email,phone,source,created_at,email_marketing_consent,sms_marketing_consent,email_unsubscribed_at,sms_unsubscribed_at,consent_source,consent_recorded_at&order=created_at.desc&limit=2000');
      return json(res, 200, { contacts: contacts || [] });
    }
    const action = String(req.body?.action || req.query?.action || '');
    if (req.method === 'GET' && action === 'history') {
      const rows = await supabaseFetch('/rest/v1/communication_send_logs?select=*&order=sent_at.desc&limit=100');
      return json(res, 200, { history: rows || [] });
    }
    if (req.method === 'GET' && action === 'campaigns') {
      const rows = await supabaseFetch('/rest/v1/communication_campaigns?select=*&order=updated_at.desc&limit=100');
      return json(res, 200, { campaigns: rows || [] });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
    if (req.method === 'POST' && action === 'save_campaign') {
      const channel = req.body?.channel === 'sms' ? 'sms' : 'email';
      const title = clean(req.body?.title);
      const subject = clean(req.body?.subject);
      const content = String(req.body?.content || '').trim();
      if (!title || !content || (channel === 'email' && !subject)) return json(res, 400, { error: 'Informe nome, conteúdo e assunto do e-mail.' });
      const payload = { channel, title, subject: channel === 'email' ? subject : null, content, updated_at: new Date().toISOString() };
      let rows;
      if (req.body?.id) rows = await supabaseFetch(`/rest/v1/communication_campaigns?id=eq.${encodeURIComponent(req.body.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      else rows = await supabaseFetch('/rest/v1/communication_campaigns', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, created_at: new Date().toISOString() }) });
      return json(res, 200, { campaign: rows?.[0] || null });
    }
    if (req.method === 'POST' && action === 'send_campaign') {
      const channel = req.body?.channel === 'sms' ? 'sms' : 'email';
      const campaignId = Number(req.body?.campaign_id);
      const ids = [...new Set((Array.isArray(req.body?.contact_ids) ? req.body.contact_ids : []).map(Number).filter(Number.isFinite))].slice(0, 2000);
      if (!campaignId || !ids.length) return json(res, 400, { error: 'Selecione uma campanha salva e pelo menos um contato.' });
      const campaigns = await supabaseFetch(`/rest/v1/communication_campaigns?id=eq.${campaignId}&select=*&limit=1`);
      const campaign = campaigns?.[0];
      if (!campaign || campaign.channel !== channel) return json(res, 404, { error: 'Comunicado não encontrado para este canal.' });
      const contacts = await supabaseFetch(`/rest/v1/communication_contacts?select=id,name,email,phone,email_marketing_consent,sms_marketing_consent,email_unsubscribed_at,sms_unsubscribed_at&id=in.(${ids.join(',')})&limit=2000`);
      const eligible = (contacts || []).filter(c => channel === 'email' ? c.email && c.email_marketing_consent && !c.email_unsubscribed_at : c.phone && c.sms_marketing_consent && !c.sms_unsubscribed_at);
      if (!eligible.length) return json(res, 400, { error: 'Nenhum contato selecionado possui consentimento ativo e dados válidos para este canal.' });
      let sent = 0; let provider = 'Resend';
      if (channel === 'email') {
        const emails = eligible.map(c => ({ to: [c.email], subject: campaign.subject, html: campaign.content }));
        const results = await sendBulkEmails({ emails });
        sent = results.length;
      } else {
        provider = 'Infobip';
        const base = String(process.env.INFOBIP_BASE_URL || '').replace(/\/$/, '');
        const key = String(process.env.INFOBIP_API_KEY || '').trim();
        const sender = String(process.env.INFOBIP_SENDER || '').trim();
        if (!base || !key || !sender) return json(res, 500, { error: 'SMS não configurado. Configure INFOBIP_BASE_URL, INFOBIP_API_KEY e INFOBIP_SENDER na Vercel.' });
        for (let i = 0; i < eligible.length; i += 100) {
          const messages = eligible.slice(i, i + 100).map(c => ({ from: sender, destinations: [{ to: c.phone.replace(/\D/g, '') }], text: campaign.content }));
          const response = await fetch(`${base}/sms/2/text/advanced`, { method: 'POST', headers: { Authorization: `App ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ messages }) });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result?.requestError?.serviceException?.text || `Infobip HTTP ${response.status}`);
          sent += messages.length;
        }
      }
      await supabaseFetch('/rest/v1/communication_send_logs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ campaign_id: campaign.id, channel, title: campaign.title, subject: campaign.subject, content: campaign.content, recipient_count: sent, provider, sent_at: new Date().toISOString() }) });
      return json(res, 200, { ok: true, sent, skipped: (contacts || []).length - eligible.length, provider });
    }
    const submissions = Array.isArray(req.body?.submissions) ? req.body.submissions.slice(0, 2000) : null;
    if (!submissions) return json(res, 400, { error: 'Lista de contatos inválida.' });

    let inserted = 0, updated = 0, duplicates = 0;
    for (const item of submissions) {
      const email = emailKey(item?.email);
      const phone = phoneKey(item?.telefone || item?.phone);
      const name = clean(item?.nome || item?.name);
      if (!email && !phone) { duplicates++; continue; }
      const matchFilters = [];
      if (email) matchFilters.push(`email.eq.${email}`);
      if (phone) matchFilters.push(`phone.eq.${phone}`);
      const matchParams = new URLSearchParams({ select: 'id,source,email_unsubscribed_at,sms_unsubscribed_at,consent_source,consent_recorded_at', limit: '1' });
      if (matchFilters.length) matchParams.set('or', `(${matchFilters.join(',')})`);
      const existing = await supabaseFetch(`/rest/v1/communication_contacts?${matchParams.toString()}`);
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

const { supabaseFetch, json } = require('../_lib/supabase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const body = req.body || {};
    const visitorId = String(body.visitorId || '').slice(0, 100);
    const sessionId = String(body.sessionId || '').slice(0, 100);
    const path = String(body.path || '/').slice(0, 300);
    const eventKey = String(body.eventId || `${sessionId}:${path}`).slice(0, 300);
    if (!visitorId || !sessionId || !eventKey) return json(res, 400, { error: 'Dados de acesso inválidos.' });
    const found = await supabaseFetch(`/rest/v1/she_site_events?event_key=eq.${encodeURIComponent(eventKey)}&select=id&limit=1`);
    if (found?.length) return json(res, 200, { ok: true, duplicate: true });
    await supabaseFetch('/rest/v1/she_site_events', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ visitor_id: visitorId, session_id: sessionId, path, referrer: String(body.referrer || '').slice(0, 1000) || null, event_key: eventKey, created_at: new Date().toISOString() }),
    });
    return json(res, 201, { ok: true });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao registrar acesso.' });
  }
};

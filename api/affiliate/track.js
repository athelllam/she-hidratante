const { supabaseFetch, json } = require('../_lib/supabase');

function validId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const { affiliateId, affiliateSlug, type, target, visitorId, path, referrer, day, eventId } = req.body || {};
    const id = validId(affiliateId);

    if (!id || type !== 'access') {
      return json(res, 400, { error: 'Evento inválido.' });
    }

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${id}&active=eq.true&select=id,slug&limit=1`);
    if (!affiliates?.[0] || (affiliateSlug && affiliates[0].slug !== String(affiliateSlug).toLowerCase())) {
      return json(res, 404, { error: 'Afiliada não encontrada.' });
    }

    // Cada visita à URL da afiliada recebe seu próprio evento.
    // O eventId evita que uma única visita seja registrada duas vezes por acidente.
    const eventKey = `access:${id}:${String(eventId || `${Date.now()}-${Math.random()}`).slice(0,100)}`;
    const existing = await supabaseFetch(
      `/rest/v1/affiliate_events?event_key=eq.${encodeURIComponent(eventKey)}&select=id&limit=1`
    );
    if (existing?.length) return json(res, 200, { ok: true, duplicate: true });

    await supabaseFetch('/rest/v1/affiliate_events', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        affiliate_id: id,
        type,
        target: target || null,
        visitor_id: String(visitorId || '').slice(0,100) || null,
        path: String(path || '').slice(0,300) || null,
        referrer: String(referrer || '').slice(0,1000) || null,
        event_key: eventKey.slice(0, 500),
      }),
    });

    return json(res, 201, { ok: true });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro ao registrar evento.' });
  }
};

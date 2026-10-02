const { requireAdmin, supabaseFetch } = require('../_lib/admin');
function json(res, status, body) { res.status(status).json(body); }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await supabaseFetch('/rest/v1/affiliate_video_submissions?select=id,affiliate_id,video_url,status,note,terms_version,terms_accepted_at,created_at,reviewed_at,affiliates(id,name,slug,email,whatsapp)&order=created_at.desc&limit=1000');
      return json(res, 200, { videos: rows || [] });
    }

    if (req.method === 'PATCH') {
      const id = Number(req.body?.id);
      const status = String(req.body?.status || '').toLowerCase();
      const note = String(req.body?.note || '').trim();

      if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: 'ID da solicitação obrigatório.' });
      if (!['approved', 'rejected'].includes(status)) return json(res, 400, { error: 'Status de análise inválido.' });

      const current = await supabaseFetch(`/rest/v1/affiliate_video_submissions?id=eq.${id}&select=id,status&limit=1`);
      if (!current?.[0]) return json(res, 404, { error: 'Solicitação de vídeo não encontrada.' });

      const rows = await supabaseFetch(`/rest/v1/affiliate_video_submissions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status, note: note || null, reviewed_at: new Date().toISOString() }),
      });
      return json(res, 200, { video: rows?.[0] || null });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.message || 'Erro nas solicitações de vídeo.' });
  }
};

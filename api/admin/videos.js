const { requireAdmin, supabaseFetch } = require('../_lib/admin');

function json(res, status, body) { res.status(status).json(body); }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const [videos, affiliates] = await Promise.all([
        supabaseFetch('/rest/v1/affiliate_video_submissions?select=id,affiliate_id,video_url,status,terms_version,terms_accepted_at,terms_accepted_ip,terms_accepted_user_agent,admin_note,reviewed_at,created_at,updated_at&order=created_at.desc&limit=500'),
        supabaseFetch('/rest/v1/affiliates?select=id,name,slug,email,whatsapp&order=name.asc'),
      ]);
      const byId = new Map((affiliates || []).map(item => [Number(item.id), item]));
      return json(res, 200, {
        videos: (videos || []).map(video => ({ ...video, affiliate: byId.get(Number(video.affiliate_id)) || null })),
      });
    }

    if (req.method === 'PATCH') {
      const id = Number(req.body?.id);
      const status = String(req.body?.status || '');
      const adminNote = String(req.body?.adminNote || '').trim().slice(0, 2000);
      if (!Number.isInteger(id) || id <= 0) return json(res, 400, { error: 'Vídeo inválido.' });
      if (!['approved', 'rejected', 'pending'].includes(status)) return json(res, 400, { error: 'Status inválido.' });

      const rows = await supabaseFetch(`/rest/v1/affiliate_video_submissions?id=eq.${id}&select=id&limit=1`);
      if (!rows?.[0]) return json(res, 404, { error: 'Vídeo não encontrado.' });

      const updated = await supabaseFetch(`/rest/v1/affiliate_video_submissions?id=eq.${id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status,
          admin_note: adminNote || null,
          reviewed_at: status === 'pending' ? null : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      return json(res, 200, { video: updated?.[0] || null });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível processar os vídeos.' });
  }
};

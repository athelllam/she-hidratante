const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');

const TERMS_VERSION = '1.0';

function validVideoUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  try {
    const { affiliate } = await requireAffiliate(req);
    const affiliateId = Number(affiliate.id);

    if (req.method === 'GET') {
      const rows = await supabaseFetch(`/rest/v1/affiliate_video_submissions?affiliate_id=eq.${affiliateId}&select=id,video_url,status,terms_version,terms_accepted_at,admin_note,reviewed_at,created_at,updated_at&order=created_at.desc&limit=100`);
      return json(res, 200, { videos: rows || [], termsVersion: TERMS_VERSION });
    }

    if (req.method === 'POST') {
      const { videoUrl, acceptedTerms } = req.body || {};
      if (!validVideoUrl(videoUrl)) return json(res, 400, { error: 'Informe um link válido do vídeo.' });
      if (acceptedTerms !== true) return json(res, 400, { error: 'É necessário aceitar os Termos e Condições para enviar o vídeo.' });

      const userAgent = String(req.headers['user-agent'] || '').slice(0, 1000);
      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      const ip = forwarded || String(req.socket?.remoteAddress || '').slice(0, 200);

      const row = await supabaseFetch('/rest/v1/affiliate_video_submissions', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          video_url: String(videoUrl).trim(),
          status: 'pending',
          terms_version: TERMS_VERSION,
          terms_accepted_at: new Date().toISOString(),
          terms_accepted_ip: ip,
          terms_accepted_user_agent: userAgent,
        }),
      });

      return json(res, 201, { video: row?.[0] || null });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível processar o vídeo.' });
  }
};

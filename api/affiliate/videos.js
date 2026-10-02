const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');

const TERMS_VERSION = '1.0';

module.exports = async function handler(req, res) {
  try {
    const { affiliate } = await requireAffiliate(req);

    if (req.method === 'GET') {
      const rows = await supabaseFetch(`/rest/v1/affiliate_video_submissions?affiliate_id=eq.${Number(affiliate.id)}&select=id,video_url,status,note,terms_version,terms_accepted_at,created_at,reviewed_at&order=created_at.desc&limit=100`);
      return json(res, 200, { videos: rows || [], termsVersion: TERMS_VERSION });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

    const videoUrl = String(req.body?.videoUrl || '').trim();
    const termsAccepted = Boolean(req.body?.termsAccepted);
    const termsVersion = String(req.body?.termsVersion || '');

    if (!videoUrl) return json(res, 400, { error: 'Informe o link do vídeo.' });
    if (videoUrl.length > 2000) return json(res, 400, { error: 'O link do vídeo é muito longo.' });
    try {
      const parsed = new URL(videoUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid');
    } catch {
      return json(res, 400, { error: 'Informe um link válido começando com http:// ou https://.' });
    }
    if (!termsAccepted || termsVersion !== TERMS_VERSION) {
      return json(res, 400, { error: 'É necessário aceitar os Termos e Condições para enviar o vídeo.' });
    }

    const rows = await supabaseFetch('/rest/v1/affiliate_video_submissions', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        affiliate_id: affiliate.id,
        video_url: videoUrl,
        status: 'pending',
        terms_version: TERMS_VERSION,
        terms_accepted_at: new Date().toISOString(),
      }),
    });

    return json(res, 201, { video: rows?.[0] || null });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.message });
  }
};

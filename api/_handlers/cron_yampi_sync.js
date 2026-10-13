const crypto = require('crypto');
const { json } = require('../_lib/supabase');
const { syncAffiliateOrders, getConfig } = require('../_lib/yampi');

function safeEqual(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return json(res, 405, { ok: false, error: 'Método não permitido.' });

  const secret = String(process.env.CRON_SECRET || '');
  const auth = String(req.headers?.authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1] || '';
  const querySecret = String(req.query?.secret || '');
  if (!secret || (!safeEqual(bearer, secret) && !safeEqual(querySecret, secret))) {
    return json(res, 401, { ok: false, error: 'Não autorizado.' });
  }

  try {
    const config = getConfig();
    if (!config.configured) return json(res, 503, { ok: false, error: 'Integração Yampi não configurada.' });
    console.log('[She Yampi Cron] start', JSON.stringify({ at: new Date().toISOString() }));
    const result = await syncAffiliateOrders(null);
    console.log('[She Yampi Cron] result', JSON.stringify(result));
    return json(res, 200, { ok: true, ...result });
  } catch (error) {
    console.error('[She Yampi Cron] failed', JSON.stringify({ message: error.message || 'sem detalhes', statusCode: error.statusCode || null }));
    return json(res, error.statusCode || 500, { ok: false, error: error.message || 'Falha na sincronização automática.' });
  }
};

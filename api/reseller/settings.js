const { supabaseFetch } = require('../_lib/supabase');
function json(res, status, body) { res.status(status).json(body); }
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Método não permitido.' });
  try {
    const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=reseller_hydrant_price,reseller_hydrant_blister_price,reseller_stick_price,reseller_complete_price&limit=1');
    const row = rows?.[0] || {};
    return json(res, 200, { ok: true, prices: {
      hydrant: Number(row.reseller_hydrant_price || 0),
      hydrantBlister: Number(row.reseller_hydrant_blister_price || 0),
      stick: Number(row.reseller_stick_price || 0),
      complete: Number(row.reseller_complete_price || 0),
    }});
  } catch (error) { return json(res, 500, { ok: false, error: error.message || 'Não foi possível carregar os preços de revenda.' }); }
};

const { requireAdmin } = require('../_lib/admin');
const { supabaseFetch, json } = require('../_lib/supabase');

const money = value => Math.round(Number(value) * 100) / 100;
const columns = {
  hydrant: 'reseller_hydrant_price',
  hydrantBlister: 'reseller_hydrant_blister_price',
  stick: 'reseller_stick_price',
  complete: 'reseller_complete_price',
};

function toPrices(row = {}) {
  return {
    hydrant: Number(row.reseller_hydrant_price ?? 0),
    hydrantBlister: Number(row.reseller_hydrant_blister_price ?? 0),
    stick: Number(row.reseller_stick_price ?? 0),
    complete: Number(row.reseller_complete_price ?? 0),
  };
}

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);
    if (req.method === 'GET') {
      const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=reseller_hydrant_price,reseller_hydrant_blister_price,reseller_stick_price,reseller_complete_price&limit=1');
      return json(res, 200, { prices: toPrices(rows?.[0]) });
    }
    if (req.method !== 'PATCH' && req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
    const requested = req.body?.prices || {};
    const values = {};
    for (const [key, column] of Object.entries(columns)) {
      const value = Number(String(requested[key] ?? '').replace(',', '.'));
      if (!Number.isFinite(value) || value < 0) return json(res, 400, { error: 'Informe preços válidos e não negativos para os quatro produtos.' });
      values[column] = money(value);
    }

    let rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1', {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(values),
    });
    if (!Array.isArray(rows) || rows.length === 0) {
      rows = await supabaseFetch('/rest/v1/affiliate_settings?on_conflict=id', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: 1, ...values }),
      });
    }
    let saved = rows?.[0];
    // Read back the persisted values; never report success based only on an empty PATCH response.
    const confirmedRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=reseller_hydrant_price,reseller_hydrant_blister_price,reseller_stick_price,reseller_complete_price&limit=1');
    saved = confirmedRows?.[0] || saved;
    const prices = toPrices(saved);
    if (!saved || Object.entries(columns).some(([key, column]) => prices[key] !== values[column])) {
      throw new Error('O Supabase não confirmou os preços salvos. Verifique se a migração migration_reseller_prices.sql foi executada.');
    }
    return json(res, 200, { prices });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível salvar os preços da loja de benefícios.' });
  }
};

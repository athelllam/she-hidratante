const { requireAdmin, supabaseFetch } = require('../_lib/admin');
function json(res, status, body) { res.status(status).json(body); }

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await supabaseFetch('/rest/v1/affiliate_withdrawals?select=id,affiliate_id,amount,status,pix_key,source,note,requested_at,processed_at,affiliates(id,slug,name,email,whatsapp)&order=requested_at.desc&limit=1000');
      return json(res, 200, { withdrawals: rows || [] });
    }

    if (req.method === 'PATCH') {
      const { id } = req.body || {};
      if (!id) return json(res, 400, { error: 'ID do saque obrigatório.' });

      const current = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&select=id,status,amount,affiliate_id&limit=1`);
      if (!current?.[0]) return json(res, 404, { error: 'Solicitação de saque não encontrada.' });
      if (current[0].status === 'paid') return json(res, 200, { withdrawal: current[0] });
      if (current[0].status !== 'pending' && current[0].status !== 'approved') {
        return json(res, 400, { error: 'Esta solicitação não está pendente de pagamento.' });
      }

      const rows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'paid',
          processed_at: new Date().toISOString(),
        }),
      });
      return json(res, 200, { withdrawal: rows?.[0] || null });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro nas solicitações de saque.' });
  }
};

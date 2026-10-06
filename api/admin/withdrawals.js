const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { sendEmail, affiliateWithdrawalApprovedEmail } = require('../_lib/email');
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

      // Marcador idempotente exclusivo do canal de e-mail.
      const current = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&select=id,status,amount,affiliate_id,email_approved_notified_at,affiliates(id,name,email)&limit=1`);
      if (!current?.[0]) return json(res, 404, { error: 'Solicitação de saque não encontrada.' });
      if (current[0].status === 'paid') return json(res, 200, { withdrawal: current[0] });
      if (current[0].status !== 'pending' && current[0].status !== 'approved') {
        return json(res, 400, { error: 'Esta solicitação não está pendente de pagamento.' });
      }

      const targetStatus = ['approved', 'paid'].includes(String(req.body?.status || '').toLowerCase())
        ? String(req.body.status).toLowerCase()
        : 'paid';
      const rows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: targetStatus,
          processed_at: new Date().toISOString(),
        }),
      });
      const updated = rows?.[0] || null;
      const shouldNotifyAffiliate = ['approved', 'paid'].includes(targetStatus) && current[0].status !== targetStatus;
      if (shouldNotifyAffiliate && current[0].affiliates?.email && !current[0].email_approved_notified_at) {
        const claimed = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&email_approved_notified_at=is.null`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ email_approved_notified_at: new Date().toISOString() }),
        });
        if (Array.isArray(claimed) && claimed.length) {
          try {
            await sendEmail({
              to: current[0].affiliates.email,
              subject: `Saque ${targetStatus === 'approved' ? 'aprovado' : 'pago'} — She Afiliadas`,
              html: affiliateWithdrawalApprovedEmail({
                name: current[0].affiliates.name,
                amount: current[0].amount,
                status: targetStatus,
              }),
              tags: [{ name: 'category', value: 'withdrawal-approved' }],
            });
          } catch (error) {
            await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`, {
              method: 'PATCH',
              headers: { Prefer: 'return=minimal' },
              body: JSON.stringify({ email_approved_notified_at: null }),
            }).catch(() => null);
            console.error('[She Email] Falha no aviso de saque aprovado:', error);
          }
        }
      }
      return json(res, 200, { withdrawal: updated });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro nas solicitações de saque.' });
  }
};

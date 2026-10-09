const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { createPixTransfer } = require('../_lib/asaas');
const { sendEmail, affiliateWithdrawalApprovedEmail } = require('../_lib/email');

function json(res, status, body) { res.status(status).json(body); }

function normalizePixKeyType(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'].includes(raw)) return raw;
  return null;
}

async function notifyAffiliate({ withdrawal, affiliate, status }) {
  if (!affiliate?.email || !['approved', 'paid', 'failed', 'rejected'].includes(status)) return;

  const subjectStatus = status === 'failed' ? 'falhou' : status === 'rejected' ? 'foi recusado' : status === 'paid' ? 'foi pago' : 'foi aprovado';
  await sendEmail({
    to: affiliate.email,
    subject: `Saque ${subjectStatus} — She Afiliadas`,
    html: affiliateWithdrawalApprovedEmail({
      name: affiliate.name,
      amount: withdrawal.amount,
      status: status === 'failed' ? 'failed' : status === 'rejected' ? 'failed' : status,
    }),
    tags: [{ name: 'category', value: 'withdrawal-status' }],
  });
}

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await supabaseFetch('/rest/v1/affiliate_withdrawals?select=id,affiliate_id,amount,status,pix_key,pix_key_type,source,note,requested_at,processed_at,asaas_transfer_id,asaas_status,asaas_fail_reason,transaction_receipt_url,affiliates(id,slug,name,email,whatsapp)&order=requested_at.desc&limit=1000');
      return json(res, 200, { withdrawals: rows || [] });
    }

    if (req.method === 'PATCH') {
      const { id } = req.body || {};
      const action = String(req.body?.action || 'approve').toLowerCase();
      if (!id) return json(res, 400, { error: 'ID do saque obrigatório.' });

      const current = await supabaseFetch(
        `/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&select=id,status,amount,pix_key,pix_key_type,source,note,asaas_transfer_id,asaas_status,affiliates(id,name,email)&limit=1`
      );
      if (!current?.[0]) return json(res, 404, { error: 'Solicitação de saque não encontrada.' });

      const withdrawal = current[0];

      if (withdrawal.status === 'paid') return json(res, 200, { withdrawal });
      if (withdrawal.status === 'processing') return json(res, 409, { error: 'Este saque já está sendo processado pelo Asaas.', withdrawal });
      if (!['pending', 'approved'].includes(withdrawal.status)) {
        return json(res, 400, { error: 'Esta solicitação não está disponível para esta ação.' });
      }

      if (action === 'reject') {
        const note = String(req.body?.note || '').trim().slice(0, 1000);
        const rejectedRows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&status=in.(pending,approved)`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ status: 'rejected', note: note || 'Solicitação de saque recusada.', processed_at: new Date().toISOString() }),
        });
        const rejected = rejectedRows?.[0] || null;
        if (!rejected) return json(res, 409, { error: 'O saque já foi processado ou alterado por outra ação.' });
        await notifyAffiliate({ withdrawal: { ...withdrawal, ...rejected }, affiliate: withdrawal.affiliates, status: 'rejected' }).catch(() => null);
        return json(res, 200, { withdrawal: rejected, message: 'Saque recusado. O valor voltou a ficar disponível para a afiliada.' });
      }

      const pixKey = String(withdrawal.pix_key || '').trim();
      const pixKeyType = normalizePixKeyType(withdrawal.pix_key_type);
      if (!pixKey || !pixKeyType) {
        return json(res, 400, { error: 'O saque não possui um tipo de chave PIX válido. Peça para a afiliada atualizar os dados.' });
      }

      // Reserva o saque antes de chamar o Asaas. Isso impede dois cliques/processamentos
      // concorrentes de criarem duas transferências para o mesmo pedido.
      const locked = await supabaseFetch(
        `/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&status=in.(pending,approved)`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            status: 'processing',
            note: withdrawal.note || null,
            processed_at: null,
          }),
        }
      );
      if (!locked?.length) {
        const latest = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&select=id,status,amount,asaas_transfer_id,asaas_status&limit=1`);
        return json(res, 409, { error: 'Este saque já foi assumido por outro processamento.', withdrawal: latest?.[0] || withdrawal });
      }

      let transfer;
      try {
        transfer = await createPixTransfer({
          value: withdrawal.amount,
          pixAddressKey: pixKey,
          pixAddressKeyType: pixKeyType,
          externalReference: `she-withdrawal-${withdrawal.id}`,
          description: `Saque She Afiliadas #${withdrawal.id}`,
        });
      } catch (error) {
        await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            status: 'failed',
            asaas_status: 'FAILED',
            asaas_fail_reason: error.message,
            processed_at: new Date().toISOString(),
          }),
        }).catch(() => null);

        return json(res, error.statusCode || 502, {
          error: `O Asaas não aceitou a transferência: ${error.message}`,
        });
      }

      const updatedRows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: String(transfer?.status || '').toUpperCase() === 'DONE' ? 'paid' : 'processing',
          asaas_transfer_id: transfer?.id || null,
          asaas_status: transfer?.status || 'PENDING',
          asaas_fail_reason: transfer?.failReason || null,
          transaction_receipt_url: transfer?.transactionReceiptUrl || null,
          processed_at: String(transfer?.status || '').toUpperCase() === 'DONE' ? new Date().toISOString() : null,
        }),
      });

      const updated = updatedRows?.[0] || null;

      if (updated?.status === 'paid') {
        await notifyAffiliate({ withdrawal: updated, affiliate: withdrawal.affiliates, status: 'paid' }).catch((error) => {
          console.error('[She Email] Falha no aviso de saque pago:', error);
        });
      } else if (updated?.status === 'processing' && withdrawal.status !== 'approved') {
        // O e-mail de aprovação só é enviado quando o saque realmente foi concluído.
      }

      return json(res, 200, {
        withdrawal: updated,
        message: updated?.status === 'paid'
          ? 'Pix enviado e confirmado pelo Asaas.'
          : 'Pix enviado ao Asaas e está em processamento.',
      });
    }

    return json(res, 405, { error: 'Método não permitido.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro nas solicitações de saque.' });
  }
};

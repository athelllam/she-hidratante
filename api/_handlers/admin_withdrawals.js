const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { createPixPayment, normalizeWooviPixType } = require('../_lib/woovi');
const { sendEmail, affiliateWithdrawalApprovedEmail } = require('../_lib/email');

function json(res, status, body) { res.status(status).json(body); }

function normalizePixKeyType(value) {
  try { return normalizeWooviPixType(value); } catch { return null; }
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
      status: status === 'failed' || status === 'rejected' ? 'failed' : status,
    }),
    tags: [{ name: 'category', value: 'withdrawal-status' }],
  });
}

module.exports = async function handler(req, res) {
  try {
    await requireAdmin(req);

    if (req.method === 'GET') {
      const rows = await supabaseFetch('/rest/v1/affiliate_withdrawals?select=id,affiliate_id,amount,status,pix_key,pix_key_type,source,note,requested_at,processed_at,woovi_payment_id,woovi_correlation_id,woovi_status,woovi_fail_reason,woovi_end_to_end_id,transaction_receipt_url,affiliates(id,slug,name,email,whatsapp)&order=requested_at.desc&limit=1000');
      return json(res, 200, { withdrawals: rows || [] });
    }

    if (req.method !== 'PATCH') return json(res, 405, { error: 'Método não permitido.' });
    const { id } = req.body || {};
    const action = String(req.body?.action || 'approve').toLowerCase();
    if (!id || !Number.isInteger(Number(id))) return json(res, 400, { error: 'ID do saque obrigatório.' });

    const current = await supabaseFetch(
      `/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&select=id,status,amount,pix_key,pix_key_type,source,note,woovi_payment_id,woovi_correlation_id,woovi_status,affiliates(id,name,email)&limit=1`
    );
    if (!current?.[0]) return json(res, 404, { error: 'Solicitação de saque não encontrada.' });
    const withdrawal = current[0];

    if (withdrawal.status === 'paid') return json(res, 200, { withdrawal, message: 'Este saque já foi pago.' });
    if (withdrawal.status === 'processing') {
      return json(res, 409, { error: 'Este saque já foi enviado à Woovi e está em processamento. Confira o status antes de tentar qualquer nova ação.', withdrawal });
    }
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
      return json(res, 400, { error: 'O saque não possui um tipo de chave Pix válido. Peça para a afiliada atualizar os dados.' });
    }

    // Idempotência: o correlationID é estável para cada solicitação e nunca deve ser trocado em tentativas posteriores.
    const correlationID = String(withdrawal.woovi_correlation_id || `she-withdrawal-${withdrawal.id}`);
    const locked = await supabaseFetch(
      `/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&status=in.(pending,approved)`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'processing',
          woovi_correlation_id: correlationID,
          woovi_status: 'REQUESTING',
          woovi_fail_reason: null,
          processed_at: null,
        }),
      }
    );
    if (!locked?.length) {
      const latest = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&select=id,status,amount,woovi_payment_id,woovi_correlation_id,woovi_status&limit=1`);
      return json(res, 409, { error: 'Este saque já foi assumido por outro processamento.', withdrawal: latest?.[0] || withdrawal });
    }

    let result;
    try {
      result = await createPixPayment({
        value: withdrawal.amount,
        pixAddressKey: pixKey,
        pixAddressKeyType: withdrawal.pix_key_type,
        correlationID,
        comment: `Saque She Afiliadas #${withdrawal.id}`,
      });
    } catch (error) {
      // Apenas erro explícito 4xx da API confirma rejeição. Falhas de rede/5xx podem
      // ocorrer depois de a Woovi aceitar o pagamento; manter reservado evita duplicidade.
      const definiteFailure = Number(error.providerStatus) >= 400 && Number(error.providerStatus) < 500;
      if (definiteFailure) {
        await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&status=eq.processing`, {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            status: 'failed',
            woovi_status: 'FAILED',
            woovi_fail_reason: String(error.message || 'A Woovi recusou o pagamento.').slice(0, 1000),
            processed_at: new Date().toISOString(),
          }),
        }).catch(() => null);
        return json(res, error.statusCode || 400, { error: `A Woovi recusou o Pix: ${error.message}` });
      }
      await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}&status=eq.processing`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          woovi_status: 'UNKNOWN',
          woovi_fail_reason: String(error.message || 'Não foi possível confirmar a resposta da Woovi.').slice(0, 1000),
        }),
      }).catch(() => null);
      return json(res, 502, {
        error: 'Não foi possível confirmar a resposta da Woovi. O saque ficou reservado para evitar pagamento duplicado. Confira a Woovi antes de tomar outra ação.',
      });
    }

    const payment = result?.payment || result?.data?.payment || {};
    const transaction = result?.transaction || result?.data?.transaction || {};
    const providerStatus = String(payment.status || result?.status || 'CREATED').toUpperCase();
    const definitelyFailed = ['FAILED', 'REJECTED', 'CANCELLED', 'DENIED'].includes(providerStatus);
    const confirmed = ['COMPLETED', 'CONFIRMED', 'PAID', 'DONE'].includes(providerStatus);
    const newStatus = definitelyFailed ? 'failed' : confirmed ? 'paid' : 'processing';
    const updatedRows = await supabaseFetch(`/rest/v1/affiliate_withdrawals?id=eq.${Number(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        status: newStatus,
        woovi_payment_id: payment.id || result?.id || null,
        woovi_correlation_id: payment.correlationID || correlationID,
        woovi_status: providerStatus,
        woovi_fail_reason: definitelyFailed ? String(payment.reason || payment.error || 'Pagamento recusado pela Woovi').slice(0, 1000) : null,
        woovi_end_to_end_id: transaction.endToEndId || null,
        transaction_receipt_url: transaction.receiptUrl || transaction.transactionReceiptUrl || null,
        processed_at: ['paid', 'failed'].includes(newStatus) ? new Date().toISOString() : null,
      }),
    });
    const updated = updatedRows?.[0] || null;

    if (updated?.status === 'paid' || updated?.status === 'failed') {
      await notifyAffiliate({ withdrawal: updated, affiliate: withdrawal.affiliates, status: updated.status }).catch(() => null);
    }

    return json(res, 200, {
      withdrawal: updated,
      message: updated?.status === 'paid'
        ? 'Pix confirmado pela Woovi.'
        : updated?.status === 'failed'
          ? 'A Woovi recusou o Pix. O saldo reservado foi liberado.'
          : 'Pix aprovado/enviado à Woovi e aguardando confirmação. O saldo continua reservado até a confirmação final.',
    });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro nas solicitações de saque.' });
  }
};

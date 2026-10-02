const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const { commissionForOrders } = require('../_lib/affiliateCommission');

module.exports = async function handler(req, res) {
  try {
    const { affiliate } = await requireAffiliate(req);

    if (req.method === 'PATCH') {
      const pixKey = String(req.body?.pixKey || '').trim();
      if (!pixKey) return json(res, 400, { error: 'Informe uma chave PIX.' });
      if (pixKey.length > 255) return json(res, 400, { error: 'A chave PIX é muito longa.' });

      const rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ pix_key: pixKey }),
      });
      return json(res, 200, { pixKey: rows?.[0]?.pix_key || pixKey });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount < 100) {
      return json(res, 400, { error: 'O saque mínimo é de R$ 100,00.' });
    }
    if (Math.abs(amount % 100) > 0.001) {
      return json(res, 400, { error: 'O saque deve ser em múltiplos de R$ 100,00.' });
    }

    const pixKey = String(affiliate.pix_key || '').trim();
    if (!pixKey) {
      return json(res, 400, { error: 'Cadastre seu PIX de recebimento antes de solicitar um saque.' });
    }

    const orders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,commission,created_at`);
    const withdrawals = await supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&status=in.(pending,approved,paid)&select=amount`);
    const { total: earned } = commissionForOrders(orders || []);
    const reserved = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const available = Math.max(0, earned - reserved);

    if (amount > available + 0.001) {
      return json(res, 400, { error: 'Saldo disponível insuficiente.', available });
    }

    const rows = await supabaseFetch('/rest/v1/affiliate_withdrawals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        affiliate_id: affiliate.id,
        amount,
        pix_key: pixKey,
        status: 'pending',
      }),
    });
    return json(res, 201, { withdrawal: rows?.[0], available: Math.max(0, available - amount) });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.message });
  }
};

const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const { commissionForOrders, DEFAULT_COMMISSION_CONFIG, normalizeConfig, isPaidOrder } = require('../_lib/affiliateCommission');

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

    const source = String(req.body?.source || 'personal').toLowerCase();
    if (!['personal', 'team'].includes(source)) return json(res, 400, { error: 'Tipo de saque inválido.' });

    const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold&limit=1');
    const settings = normalizeConfig(settingRows?.[0] ? {
      ticketThreshold: settingRows[0].ticket_threshold,
      ticketBonus: settingRows[0].ticket_bonus,
      teamCommissionPerSale: settingRows[0].team_commission_per_sale,
      commissions: { none: settingRows[0].commission_none, bronze: settingRows[0].commission_bronze, silver: settingRows[0].commission_silver, gold: settingRows[0].commission_gold },
    } : DEFAULT_COMMISSION_CONFIG);

    const withdrawals = await supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&source=eq.${source}&status=in.(pending,approved,paid)&select=amount`);
    let earned = 0;

    if (source === 'personal') {
      const orders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,commission,created_at`);
      earned = commissionForOrders(orders || [], settings).total;
    } else {
      const children = await supabaseFetch(`/rest/v1/affiliates?team_parent_id=eq.${affiliate.id}&select=id&limit=1000`);
      const ids = (children || []).map(row => Number(row.id)).filter(Boolean);
      if (!ids.length) return json(res, 400, { error: 'Sua equipe ainda não possui vendas para saque.' });
      const childOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=in.(${ids.join(',')})&select=affiliate_id,status,team_commission,created_at&limit=20000`);
      earned = (childOrders || []).filter(isPaidOrder).reduce((sum, order) => sum + Number(order.team_commission || 0), 0);
    }

    const reserved = (withdrawals || []).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const available = Math.max(0, earned - reserved);

    if (amount > available + 0.001) {
      return json(res, 400, { error: source === 'team' ? 'Comissão de equipe disponível insuficiente.' : 'Saldo disponível insuficiente.', available });
    }

    const rows = await supabaseFetch('/rest/v1/affiliate_withdrawals', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        affiliate_id: affiliate.id,
        amount,
        pix_key: pixKey,
        source,
        status: 'pending',
      }),
    });
    return json(res, 201, { withdrawal: rows?.[0], available: Math.max(0, available - amount) });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.message });
  }
};

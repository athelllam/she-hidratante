const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const { commissionForOrders, reconcileAffiliateOrderCommissions, DEFAULT_COMMISSION_CONFIG, normalizeConfig, isPaidOrder } = require('../_lib/affiliateCommission');
const { sendEmail, adminRecipients, adminWithdrawalEmail } = require('../_lib/email');

module.exports = async function handler(req, res) {
  try {
    const { affiliate } = await requireAffiliate(req);

    if (req.method === 'PATCH') {
      const pixKey = String(req.body?.pixKey || '').trim();
      const pixKeyType = String(req.body?.pixKeyType || '').trim().toUpperCase();
      if (!pixKey) return json(res, 400, { error: 'Informe uma chave PIX.' });
      if (pixKey.length > 255) return json(res, 400, { error: 'A chave PIX é muito longa.' });
      if (!['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'].includes(pixKeyType)) {
        return json(res, 400, { error: 'Selecione o tipo da chave PIX.' });
      }

      const rows = await supabaseFetch(`/rest/v1/affiliates?id=eq.${Number(affiliate.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ pix_key: pixKey, pix_key_type: pixKeyType }),
      });
      return json(res, 200, { pixKey: rows?.[0]?.pix_key || pixKey });
    }

    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(res, 400, { error: 'Informe um valor de saque válido.' });
    }

    const pixKey = String(affiliate.pix_key || '').trim();
    const pixKeyType = String(affiliate.pix_key_type || '').trim().toUpperCase();
    if (!pixKey) {
      return json(res, 400, { error: 'Cadastre seu PIX de recebimento antes de solicitar um saque.' });
    }

    if (!['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'].includes(pixKeyType)) {
      return json(res, 400, { error: 'Cadastre também o tipo da sua chave PIX.' });
    }

    const source = String(req.body?.source || 'personal').toLowerCase();
    if (!['personal', 'team'].includes(source)) return json(res, 400, { error: 'Tipo de saque inválido.' });

    const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold,personal_withdrawal_min,team_withdrawal_min&limit=1');
    const settings = normalizeConfig(settingRows?.[0] ? {
      ticketThreshold: settingRows[0].ticket_threshold,
      ticketBonus: settingRows[0].ticket_bonus,
      teamCommissionPerSale: settingRows[0].team_commission_per_sale,
      commissions: { none: settingRows[0].commission_none, bronze: settingRows[0].commission_bronze, silver: settingRows[0].commission_silver, gold: settingRows[0].commission_gold },
    } : DEFAULT_COMMISSION_CONFIG);
    const minimum = source === 'team'
      ? 100
      : Number(settingRows?.[0]?.personal_withdrawal_min ?? 100);
    const safeMinimum = Number.isFinite(minimum) && minimum >= 0 ? minimum : 100;
    if (amount + 0.001 < safeMinimum) {
      return json(res, 400, { error: `O saque mínimo é de R$ ${safeMinimum.toFixed(2).replace('.', ',')}.`, minimum: safeMinimum });
    }
    // O valor pode ser o mínimo ou o mínimo acrescido de qualquer múltiplo de R$100.
    // Ex.: mínimo R$5 => R$5, R$105, R$205...
    if (Math.abs(((amount - safeMinimum) % 100)) > 0.001) {
      return json(res, 400, { error: `O saque deve ser de R$ ${safeMinimum.toFixed(2).replace('.', ',')} ou em incrementos de R$ 100,00 a partir desse valor.`, minimum: safeMinimum });
    }

    const withdrawals = await supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&source=eq.${source}&status=in.(pending,approved,processing,paid)&select=amount`);
    let earned = 0;

    if (source === 'personal') {
      const orders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at`);
      await reconcileAffiliateOrderCommissions(supabaseFetch, affiliate.id, settings, { teamJoinedAt: affiliate.team_joined_at }).catch(() => null);
      const refreshedOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at`);
      earned = commissionForOrders(refreshedOrders || orders || [], settings, { teamJoinedAt: affiliate.team_joined_at }).total;
    } else {
      const children = await supabaseFetch(`/rest/v1/affiliates?team_parent_id=eq.${affiliate.id}&select=id&limit=1000`);
      const ids = (children || []).map(row => Number(row.id)).filter(Boolean);
      if (!ids.length) return json(res, 400, { error: 'Sua equipe ainda não possui vendas para saque.' });
      const childOrders = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=in.(${ids.join(',')})&select=affiliate_id,status,team_commission_snapshot,created_at&limit=20000`);
      earned = (childOrders || []).filter(isPaidOrder).reduce((sum, order) => {
        const snapshot = Number(order.team_commission_snapshot);
        return sum + (Number.isFinite(snapshot) && snapshot > 0 ? snapshot : Number(settings.teamCommissionPerSale || 10));
      }, 0);
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
        pix_key_type: pixKeyType,
        source,
        status: 'pending',
      }),
    });
    const withdrawal = rows?.[0] || null;
    if (withdrawal) {
      await sendEmail({
        to: adminRecipients(),
        subject: `Nova solicitação de saque — ${affiliate.name}`,
        html: adminWithdrawalEmail({
          name: affiliate.name,
          email: affiliate.email,
          amount: withdrawal.amount,
          pixKey: withdrawal.pix_key,
          source: withdrawal.source,
        }),
        tags: [{ name: 'category', value: 'withdrawal-request' }],
      }).catch((error) => {
        console.error('[She Email] Falha no aviso de nova solicitação de saque:', error);
      });
    }
    return json(res, 201, { withdrawal, available: Math.max(0, available - amount) });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.message });
  }
};

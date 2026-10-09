const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const { commissionForOrders, reconcileAffiliateOrderCommissions, DEFAULT_COMMISSION_CONFIG, normalizeConfig, isPaidOrder } = require('../_lib/affiliateCommission');

function monthKeySaoPaulo(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(date);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  return year && month ? `${year}-${month}` : null;
}
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
    if (!Number.isFinite(amount) || amount < 100) {
      return json(res, 400, { error: 'O saque mínimo é de R$ 100,00.' });
    }
    if (Math.abs(amount % 100) > 0.001) {
      return json(res, 400, { error: 'O saque deve ser em múltiplos de R$ 100,00.' });
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

    // Todo saque, pessoal ou de equipe, exige pelo menos 1 venda pessoal paga no mês atual.
    const now = new Date();
    const saoPauloParts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now);
    const spYear = Number(saoPauloParts.find(part => part.type === 'year')?.value);
    const spMonth = Number(saoPauloParts.find(part => part.type === 'month')?.value);
    const monthStart = new Date(Date.UTC(spYear, spMonth - 1, 1, 3, 0, 0));
    const nextMonthStart = new Date(Date.UTC(spYear, spMonth, 1, 3, 0, 0));
    const ownOrdersForWithdrawal = await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,created_at&created_at=gte.${encodeURIComponent(monthStart.toISOString())}&created_at=lt.${encodeURIComponent(nextMonthStart.toISOString())}&limit=5000`);
    const personalSalesThisMonth = (ownOrdersForWithdrawal || []).filter(isPaidOrder).length;
    if (personalSalesThisMonth < 1) {
      return json(res, 400, { error: 'Você precisa ter pelo menos 1 venda pessoal contabilizada neste mês para solicitar um saque.' });
    }

    const settingRows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,commission_none,commission_bronze,commission_silver,commission_gold&limit=1');
    const settings = normalizeConfig(settingRows?.[0] ? {
      ticketThreshold: settingRows[0].ticket_threshold,
      ticketBonus: settingRows[0].ticket_bonus,
      teamCommissionPerSale: settingRows[0].team_commission_per_sale,
      commissions: { none: settingRows[0].commission_none, bronze: settingRows[0].commission_bronze, silver: settingRows[0].commission_silver, gold: settingRows[0].commission_gold },
    } : DEFAULT_COMMISSION_CONFIG);

    const withdrawals = await supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&source=eq.${source}&select=amount,status&limit=5000`);
    let earned = 0;

    if (source === 'personal') {
      // Use the same team-sales context as the dashboard. Monthly qualification
      // includes personal + team sales, so omitting team sales here can calculate
      // a lower commission than the amount shown in the affiliate dashboard.
      const ordersPath = `/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at&order=created_at.asc&limit=10000`;
      const orders = await supabaseFetch(ordersPath);

      const teamMembers = await supabaseFetch(`/rest/v1/affiliates?team_parent_id=eq.${Number(affiliate.id)}&select=id&limit=1000`);
      const teamIds = (teamMembers || []).map(row => Number(row.id)).filter(id => Number.isInteger(id) && id > 0);
      const teamOrders = teamIds.length
        ? await supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=in.(${teamIds.join(',')})&select=status,created_at&order=created_at.asc&limit=20000`)
        : [];
      const teamSalesByMonth = (teamOrders || []).filter(isPaidOrder).reduce((map, order) => {
        const key = monthKeySaoPaulo(order.created_at);
        if (key) map[key] = (map[key] || 0) + 1;
        return map;
      }, {});

      await reconcileAffiliateOrderCommissions(supabaseFetch, affiliate.id, settings, {
        teamJoinedAt: affiliate.team_joined_at,
        teamSalesByMonth,
      }).catch(() => null);

      const refreshedOrders = await supabaseFetch(ordersPath);
      earned = commissionForOrders(refreshedOrders || orders || [], settings, {
        teamJoinedAt: affiliate.team_joined_at,
        teamSalesByMonth,
      }).total;
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

    const reserved = (withdrawals || []).filter(w => !['rejected', 'failed', 'cancelled'].includes(String(w.status || ''))).reduce((sum, w) => sum + Number(w.amount || 0), 0);
    let reservedBoosts = 0;
    if (source === 'personal') {
      const boosts = await supabaseFetch(`/rest/v1/affiliate_team_boosts?affiliate_id=eq.${affiliate.id}&select=price,status&limit=5000`).catch(() => []);
      reservedBoosts = (boosts || []).filter(row => ['queued', 'active', 'completed'].includes(String(row.status || ''))).reduce((sum, row) => sum + Number(row.price || 0), 0);
    }
    const available = Math.max(0, earned - reserved - reservedBoosts);

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
    return json(res, 201, { withdrawal, available: Math.max(0, available - amount), totalCommission: earned });
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.message });
  }
};

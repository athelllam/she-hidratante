const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/admin');
const { commissionForOrders, normalizeConfig, DEFAULT_COMMISSION_CONFIG } = require('../_lib/affiliateCommission');

const money = v => Math.round((Number(v) || 0) * 100) / 100;
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query?.admin === '1') {
        await requireAdmin(req);
        const [purchases, settings] = await Promise.all([
          supabaseFetch('/rest/v1/affiliate_product_purchases?select=*,affiliate:affiliates(id,name,email,whatsapp)&order=created_at.desc&limit=500'),
          supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=affiliate_hydrant_price,affiliate_stick_price&limit=1')
        ]);
        return json(res, 200, { purchases: purchases || [], prices: { hydrant: Number(settings?.[0]?.affiliate_hydrant_price ?? 80), stick: Number(settings?.[0]?.affiliate_stick_price ?? 100) } });
      }
      const { affiliate } = await requireAffiliate(req);
      const [purchases, settings] = await Promise.all([
        supabaseFetch(`/rest/v1/affiliate_product_purchases?affiliate_id=eq.${affiliate.id}&select=*&order=created_at.desc&limit=100`),
        supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=affiliate_hydrant_price,affiliate_stick_price&limit=1')
      ]);
      return json(res, 200, { purchases: purchases || [], prices: { hydrant: Number(settings?.[0]?.affiliate_hydrant_price ?? 80), stick: Number(settings?.[0]?.affiliate_stick_price ?? 100) } });
    }

    if (req.method !== 'POST' && req.method !== 'PATCH') return json(res, 405, { error: 'Método não permitido.' });

    if (req.query?.admin === '1') {
      await requireAdmin(req);
      const action = String(req.body?.action || '');
      if (action === 'set_prices') {
        const hydrant = Number(req.body?.hydrant), stick = Number(req.body?.stick);
        if (!Number.isFinite(hydrant) || hydrant <= 0 || !Number.isFinite(stick) || stick <= 0) return json(res, 400, { error: 'Informe preços válidos.' });
        const payload = { affiliate_hydrant_price: money(hydrant), affiliate_stick_price: money(stick) };
        let rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1', {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
        // A PATCH against a missing settings row returns HTTP 204/200 with an empty
        // array, which previously looked like success in the admin UI but saved nothing.
        if (!Array.isArray(rows) || rows.length === 0) {
          rows = await supabaseFetch('/rest/v1/affiliate_settings?on_conflict=id', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: JSON.stringify({ id: 1, ...payload }),
          });
        }
        const saved = rows?.[0];
        if (!saved || Number(saved.affiliate_hydrant_price) !== payload.affiliate_hydrant_price ||
            Number(saved.affiliate_stick_price) !== payload.affiliate_stick_price) {
          throw new Error('O banco não confirmou a gravação dos preços. Confira a configuração affiliate_settings no Supabase.');
        }
        return json(res, 200, { prices: { hydrant: Number(saved.affiliate_hydrant_price), stick: Number(saved.affiliate_stick_price) } });
      }
      const id = Number(req.body?.id), actionStatus = String(req.body?.status || '');
      if (!id || !['approved','rejected','shipped'].includes(actionStatus)) return json(res, 400, { error: 'Ação de compra inválida.' });
      const rows = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${id}&select=*&limit=1`);
      const purchase = rows?.[0];
      if (!purchase) return json(res, 404, { error: 'Compra não encontrada.' });
      if (purchase.status !== 'pending' && !(purchase.status === 'shipped' && actionStatus === 'approved')) return json(res, 409, { error: 'Esta solicitação já foi processada.' });
      const patch = { status: actionStatus, updated_at: new Date().toISOString() };
      if (actionStatus === 'approved') patch.approved_at = new Date().toISOString();
      if (actionStatus === 'shipped') patch.shipped_at = new Date().toISOString();
      if (actionStatus === 'rejected') patch.rejected_at = new Date().toISOString();
      const updated = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      return json(res, 200, { purchase: updated?.[0] || { ...purchase, ...patch } });
    }

    const { affiliate } = await requireAffiliate(req);
    if (req.method !== 'POST' || String(req.body?.action || '') !== 'purchase') return json(res, 400, { error: 'Ação inválida.' });
    const product = String(req.body?.product || '');
    if (!['hydrant','stick'].includes(product)) return json(res, 400, { error: 'Produto inválido.' });
    const f = req.body?.form || {};
    const name = String(f.name || '').trim(), cpf = String(f.cpf || '').replace(/\D/g, ''), cep = String(f.cep || '').replace(/\D/g, '');
    const address = String(f.address || '').trim(), email = String(f.email || '').trim().toLowerCase(), phone = String(f.phone || '').trim(), notes = String(f.notes || '').trim();
    if (name.length < 3 || cpf.length !== 11 || cep.length !== 8 || address.length < 8 || !validEmail(email) || phone.replace(/\D/g,'').length < 10) return json(res, 400, { error: 'Preencha corretamente todos os campos obrigatórios.' });

    const [settingsRows, orders, withdrawals, boosts, openPurchases] = await Promise.all([
      supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,team_advanced1_members,team_advanced1_sales,team_advanced1_commission,team_advanced2_members,team_advanced2_sales,team_advanced2_commission,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales,affiliate_hydrant_price,affiliate_stick_price&limit=1'),
      supabaseFetch(`/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=status,total,created_at&order=created_at.asc&limit=5000`),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&source=eq.personal&select=amount,status&limit=1000`),
      supabaseFetch(`/rest/v1/affiliate_team_boosts?affiliate_id=eq.${affiliate.id}&select=price,status&limit=1000`).catch(() => []),
      supabaseFetch(`/rest/v1/affiliate_product_purchases?affiliate_id=eq.${affiliate.id}&status=in.(pending,shipped,approved)&select=product,status,price,created_at&limit=1000`)
    ]);
    const row = settingsRows?.[0] || {};
    const settings = normalizeConfig(row ? {
      ticketThreshold: row.ticket_threshold, ticketBonus: row.ticket_bonus, teamCommissionPerSale: row.team_commission_per_sale,
      teamAdvanced1: { members: row.team_advanced1_members, sales: row.team_advanced1_sales, commissionPerSale: row.team_advanced1_commission },
      teamAdvanced2: { members: row.team_advanced2_members, sales: row.team_advanced2_sales, commissionPerSale: row.team_advanced2_commission },
      commissions: { none: row.commission_none, bronze: row.commission_bronze, silver: row.commission_silver, gold: row.commission_gold },
      monthlyLevels: { bronze: row.monthly_bronze_sales, silver: row.monthly_silver_sales, gold: row.monthly_gold_sales },
      fixedLevels: { bronze: row.fixed_bronze_sales, silver: row.fixed_silver_sales, gold: row.fixed_gold_sales }
    } : DEFAULT_COMMISSION_CONFIG);
    const earned = commissionForOrders(orders || [], settings, { teamJoinedAt: affiliate.team_joined_at }).total;
    const reservedWithdrawals = (withdrawals || []).filter(w => !['rejected','failed','cancelled'].includes(w.status)).reduce((n,w)=>n+Number(w.amount||0),0);
    const reservedBoosts = (boosts || []).filter(b => ['queued','active','completed'].includes(b.status)).reduce((n,b)=>n+Number(b.price||0),0);
    const reservedPurchases = (openPurchases || []).filter(p => ['pending','shipped'].includes(p.status)).reduce((n,p)=>n+Number(p.price||0),0);
    const price = money(product === 'hydrant' ? (row.affiliate_hydrant_price ?? 80) : (row.affiliate_stick_price ?? 100));
    if (earned - reservedWithdrawals - reservedBoosts - reservedPurchases < price) return json(res, 400, { error: 'Saldo disponível insuficiente para esta compra.' });
    const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0,7);
    const monthRows = await supabaseFetch(`/rest/v1/affiliate_product_purchases?affiliate_id=eq.${affiliate.id}&product=eq.${product}&created_at=gte.${month}-01T00:00:00-03:00&status=not.in.(rejected,cancelled)&select=id&limit=1`);
    if (monthRows?.length) return json(res, 409, { error: 'Você já solicitou este produto neste mês.' });
    const rows = await supabaseFetch('/rest/v1/affiliate_product_purchases', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ affiliate_id: Number(affiliate.id), product, price, status: 'pending', full_name: name, cpf, cep, address, email, phone, notes }) });
    return json(res, 201, { purchase: rows?.[0] });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível processar a solicitação.' });
  }
};

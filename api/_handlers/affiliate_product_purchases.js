const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const { requireAdmin } = require('../_lib/admin');
const { commissionForOrders, reconcileAffiliateOrderCommissions, normalizeConfig, DEFAULT_COMMISSION_CONFIG } = require('../_lib/affiliateCommission');
const { wooviFetch } = require('../_lib/woovi');
const FREIGHT_VALUE = 16;

async function createFreightCharge(purchase, affiliate) {
  const correlationID = `SHE-FRETE-AF-${purchase.id}-${Date.now()}`;
  const result = await wooviFetch('/api/v1/charge', {
    method: 'POST',
    body: JSON.stringify({
      correlationID,
      value: Math.round(FREIGHT_VALUE * 100),
      comment: `Frete loja de benefícios She - solicitação ${purchase.id}`.slice(0, 140),
      customer: { name: purchase.full_name || affiliate.name, email: purchase.email || affiliate.email, taxID: String(purchase.cpf || '').replace(/\D/g, '') },
    }),
  });
  const charge = result?.charge || result;
  const paymentUrl = result?.paymentLinkUrl || charge?.paymentLinkUrl || charge?.url || result?.url || '';
  if (!paymentUrl) {
    const error = new Error('A Woovi criou/consultou a cobrança, mas não retornou o link de pagamento. Confira a cobrança no painel Woovi antes de tentar novamente.');
    error.statusCode = 502;
    error.uncertain = true;
    throw error;
  }
  const updated = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${Number(purchase.id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ freight_amount: FREIGHT_VALUE, freight_paid: false, freight_payment_url: paymentUrl, freight_correlation_id: correlationID, freight_charge_id: String(charge?.identifier || charge?.id || charge?.correlationID || correlationID), updated_at: new Date().toISOString() }),
  });
  return updated?.[0] || { ...purchase, freight_amount: FREIGHT_VALUE, freight_paid: false, freight_payment_url: paymentUrl, freight_correlation_id: correlationID };
}

const money = v => Math.round((Number(v) || 0) * 100) / 100;
const validEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());

async function getMelhorEnvioAccessToken(forceRefresh = false) {
  const rows = await supabaseFetch('/rest/v1/melhor_envio_credentials?id=eq.1&select=id,environment,access_token,refresh_token,expires_at&limit=1');
  const current = rows?.[0];
  const env = String(process.env.MELHOR_ENVIO_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox';
  if (!current || current.environment !== env) {
    const error = new Error(`Melhor Envio ainda não autorizado no ambiente ${env}. Acesse /api/melhor-envio/authorize no painel administrativo.`);
    error.statusCode = 503; throw error;
  }
  // Renovar com antecedência evita que uma cotação comece com token quase expirado.
  if (!forceRefresh && Date.parse(current.expires_at) > Date.now() + 10 * 60 * 1000) return current.access_token;
  const clientId = String(process.env.MELHOR_ENVIO_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MELHOR_ENVIO_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret || !current.refresh_token) {
    const error = new Error('Não foi possível renovar o token do Melhor Envio. Confira as credenciais e, se o refresh token expirou, autorize novamente.'); error.statusCode = 503; throw error;
  }
  const host = env === 'sandbox' ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br';
  const response = await fetch(`${host}/oauth/token`, {
    method:'POST', headers:{ Accept:'application/json', 'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'She Afiliadas (suporte@shecoisademulher.com.br)' },
    body:new URLSearchParams({ grant_type:'refresh_token', refresh_token:current.refresh_token, client_id:clientId, client_secret:clientSecret })
  });
  const raw = await response.text(); let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message:raw.slice(0,500) }; }
  if (!response.ok || !data.access_token) { const error = new Error(data.message || data.error_description || data.error || `Não foi possível renovar o token do Melhor Envio (HTTP ${response.status}). Se o refresh token expirou, autorize novamente.`); error.statusCode = 502; throw error; }
  const expiresIn = Number(data.expires_in || 2592000);
  const updated = { environment:env, token_type:String(data.token_type || 'Bearer'), access_token:String(data.access_token), refresh_token:String(data.refresh_token || current.refresh_token), expires_at:new Date(Date.now()+expiresIn*1000).toISOString(), updated_at:new Date().toISOString() };
  // O refresh token pode ser rotativo: persistir ambos juntos após cada renovação.
  await supabaseFetch('/rest/v1/melhor_envio_credentials?id=eq.1', { method:'PATCH', headers:{ Prefer:'return=minimal' }, body:JSON.stringify(updated) });
  return updated.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0'); }
  try {
    if (req.method === 'GET') {
      if (req.query?.admin === '1') {
        await requireAdmin(req);
        const [purchases, settings] = await Promise.all([
          supabaseFetch('/rest/v1/affiliate_product_purchases?select=*,affiliate:affiliates(id,name,email,whatsapp)&order=created_at.desc&limit=500'),
          supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=affiliate_hydrant_price,affiliate_stick_price&limit=1')
        ]);
        const setting = settings?.[0];
        if (!setting || !(Number(setting.affiliate_hydrant_price) > 0) || !(Number(setting.affiliate_stick_price) > 0)) {
          const error = new Error('Preços não encontrados em affiliate_settings (id=1).');
          error.statusCode = 500;
          throw error;
        }
        return json(res, 200, { purchases: purchases || [], prices: { hydrant: Number(setting.affiliate_hydrant_price), stick: Number(setting.affiliate_stick_price) } });
      }
      const { affiliate } = await requireAffiliate(req);
      const [purchases, settings] = await Promise.all([
        supabaseFetch(`/rest/v1/affiliate_product_purchases?affiliate_id=eq.${affiliate.id}&select=*&order=created_at.desc&limit=100`),
        supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=affiliate_hydrant_price,affiliate_stick_price&limit=1')
      ]);
      const setting = settings?.[0];
      if (!setting || !(Number(setting.affiliate_hydrant_price) > 0) || !(Number(setting.affiliate_stick_price) > 0)) {
        const error = new Error('Preços não encontrados em affiliate_settings (id=1).');
        error.statusCode = 500;
        throw error;
      }
      return json(res, 200, { purchases: purchases || [], prices: { hydrant: Number(setting.affiliate_hydrant_price), stick: Number(setting.affiliate_stick_price) } });
    }

    if (req.method !== 'POST' && req.method !== 'PATCH') return json(res, 405, { error: 'Método não permitido.' });

    if (req.query?.admin === '1') {
      await requireAdmin(req);
      const action = String(req.body?.action || '');
      if (action === 'melhor_envio_quote_batch') {
        let token;
        try { token = await getMelhorEnvioAccessToken(); }
        catch (tokenError) { return json(res, Number(tokenError.statusCode) || 503, { error: tokenError.message || 'Autorize o Melhor Envio antes de cotar.' }); }
        const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map(Number).filter(id => Number.isSafeInteger(id) && id > 0))];
        if (!ids.length) return json(res, 400, { error: 'Selecione pelo menos uma solicitação.' });
        if (ids.length > 30) return json(res, 400, { error: 'Selecione no máximo 30 pedidos por lote.' });
        const baseUrl = String(process.env.MELHOR_ENVIO_ENV || 'production').toLowerCase() === 'sandbox' ? 'https://sandbox.melhorenvio.com.br/api/v2' : 'https://www.melhorenvio.com.br/api/v2';
        const purchases = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=in.(${ids.join(',')})&select=id,status,freight_paid,cep,price,product,tracking_url,street,house_number,complement,neighborhood,city,state,full_name,email,phone,cpf`);
        if ((purchases || []).length !== ids.length) return json(res, 400, { error: 'Uma ou mais solicitações não foram encontradas.' });
        const results = [];
        for (const purchase of purchases) {
          if (purchase.status !== 'pending' || purchase.freight_paid !== true || purchase.tracking_url) {
            results.push({ id: purchase.id, ok: false, error: 'Somente solicitações pendentes, com frete aprovado e sem rastreio podem ser cotadas.' });
            continue;
          }
          const cep = String(purchase.cep || '').replace(/\D/g, '');
          if (cep.length !== 8) { results.push({ id: purchase.id, ok: false, error: 'CEP de destino inválido.' }); continue; }
          try {
            const requestQuote = accessToken => fetch(`${baseUrl}/me/shipment/calculate`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'She Afiliadas (suporte@shecoisademulher.com.br)' },
              body: JSON.stringify({
                from: { postal_code: '30190000' },
                to: { postal_code: cep },
                products: [{ id: `she-${purchase.id}`, width: 25, height: 5, length: 19, weight: 0.15, insurance_value: Number(purchase.price || 0), quantity: 1 }],
              }),
            });
            let response = await requestQuote(token);
            // Se o Melhor Envio rejeitar o token antes do expires_at, renova e repete uma única vez.
            if (response.status === 401) {
              token = await getMelhorEnvioAccessToken(true);
              response = await requestQuote(token);
            }
            const raw = await response.text();
            let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw.slice(0, 500) }; }
            if (!response.ok) throw new Error(data?.message || data?.error || `Melhor Envio respondeu HTTP ${response.status}`);
            const quotes = (Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []).filter(q => !q.error && (q.id || q.service_id || q.price));
            const patch = { melhor_envio_quote: { requested_at: new Date().toISOString(), quotes, raw: data }, updated_at: new Date().toISOString() };
            await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${Number(purchase.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
            results.push({ id: purchase.id, ok: true, quotes, message: quotes.length ? null : 'Nenhuma transportadora retornou cotação.' });
          } catch (error) { results.push({ id: purchase.id, ok: false, error: error.message || 'Falha ao cotar.' }); }
        }
        return json(res, 200, { results, originPostalCode: '30190000', package: { weightKg: 0.15, widthCm: 25, heightCm: 5, lengthCm: 19 } });
      }
      if (action === 'set_prices') {
        const hydrant = Number(req.body?.hydrant), stick = Number(req.body?.stick);
        if (!Number.isFinite(hydrant) || hydrant <= 0 || !Number.isFinite(stick) || stick <= 0) return json(res, 400, { error: 'Informe preços válidos.' });
        const payload = { affiliate_hydrant_price: money(hydrant), affiliate_stick_price: money(stick) };
        const rows = await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=id,affiliate_hydrant_price,affiliate_stick_price', {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify(payload),
        });
        // Confirma a gravação lendo novamente o registro; não responde sucesso
        // caso o PATCH não tenha atualizado a linha id=1.
        const verified = rows?.[0] || (await supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=id,affiliate_hydrant_price,affiliate_stick_price&limit=1'))?.[0];
        if (!verified || Number(verified.affiliate_hydrant_price) !== payload.affiliate_hydrant_price || Number(verified.affiliate_stick_price) !== payload.affiliate_stick_price) {
          const error = new Error('Não foi possível confirmar a gravação dos preços em affiliate_settings (id=1).');
          error.statusCode = 500;
          throw error;
        }
        return json(res, 200, { prices: { hydrant: Number(verified.affiliate_hydrant_price), stick: Number(verified.affiliate_stick_price) } });
      }
      const id = Number(req.body?.id), actionStatus = String(req.body?.status || '');
      const trackingUrl = String(req.body?.tracking_url || '').trim();
      if (!id || !['approved','rejected','shipped'].includes(actionStatus)) return json(res, 400, { error: 'Ação de compra inválida.' });
      if (actionStatus === 'shipped') {
        let parsedTrackingUrl;
        try { parsedTrackingUrl = new URL(trackingUrl); } catch { parsedTrackingUrl = null; }
        if (!parsedTrackingUrl || !['http:', 'https:'].includes(parsedTrackingUrl.protocol)) return json(res, 400, { error: 'Informe um link de rastreio válido (http:// ou https://) antes de marcar como enviado.' });
      }
      const rows = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${id}&select=*&limit=1`);
      const purchase = rows?.[0];
      if (!purchase) return json(res, 404, { error: 'Compra não encontrada.' });
      if (purchase.status !== 'pending' && !(purchase.status === 'shipped' && actionStatus === 'approved')) return json(res, 409, { error: 'Esta solicitação já foi processada.' });
      if (actionStatus === 'shipped' && purchase.freight_paid !== true) return json(res, 409, { error: 'O frete de R$ 16,00 ainda não foi confirmado pela Woovi.' });
      if (actionStatus === 'approved' && purchase.status !== 'shipped') return json(res, 409, { error: 'Marque o produto como enviado antes de aprovar e debitar o saldo.' });
      const patch = { status: actionStatus, updated_at: new Date().toISOString() };
      if (actionStatus === 'approved') patch.approved_at = new Date().toISOString();
      if (actionStatus === 'shipped') {
        patch.shipped_at = new Date().toISOString();
        patch.tracking_url = trackingUrl;
      }
      if (actionStatus === 'rejected') patch.rejected_at = new Date().toISOString();
      const updated = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
      return json(res, 200, { purchase: updated?.[0] || { ...purchase, ...patch } });
    }

    const { affiliate } = await requireAffiliate(req);
    if (req.method === 'POST' && String(req.body?.action || '') === 'create_freight_charge') {
      const purchaseId = Number(req.body?.id);
      if (!Number.isSafeInteger(purchaseId) || purchaseId < 1) return json(res, 400, { error: 'Solicitação inválida.' });
      const found = await supabaseFetch(`/rest/v1/affiliate_product_purchases?id=eq.${purchaseId}&affiliate_id=eq.${Number(affiliate.id)}&select=*&limit=1`);
      const purchase = found?.[0];
      if (!purchase) return json(res, 404, { error: 'Solicitação não encontrada.' });
      if (purchase.freight_paid === true) return json(res, 200, { purchase, alreadyPaid: true });
      if (purchase.freight_payment_url) return json(res, 200, { purchase });
      const updated = await createFreightCharge(purchase, affiliate);
      return json(res, 200, { purchase: updated });
    }
    if (req.method !== 'POST' || String(req.body?.action || '') !== 'purchase') return json(res, 400, { error: 'Ação inválida.' });
    const product = String(req.body?.product || '');
    if (!['hydrant','stick'].includes(product)) return json(res, 400, { error: 'Produto inválido.' });
    const f = req.body?.form || {};
    const name = String(f.name || '').trim(), cpf = String(f.cpf || '').replace(/\D/g, ''), cep = String(f.cep || '').replace(/\D/g, '');
    const address = String(f.address || '').trim(), email = String(f.email || '').trim().toLowerCase(), phone = String(f.phone || '').trim(), notes = String(f.notes || '').trim();
    const street = String(f.street || '').trim();
    const house_number = String(f.number || '').trim();
    const complement = String(f.complement || '').trim();
    const neighborhood = String(f.neighborhood || '').trim();
    const city = String(f.city || '').trim();
    const state = String(f.state || '').trim().toUpperCase();
    if (name.length < 3 || cpf.length !== 11 || cep.length !== 8 || address.length < 8 || !validEmail(email) || phone.replace(/\D/g,'').length < 10) return json(res, 400, { error: 'Preencha corretamente todos os campos obrigatórios.' });

    const [settingsRows, withdrawals, boosts, openPurchases] = await Promise.all([
      supabaseFetch('/rest/v1/affiliate_settings?id=eq.1&select=ticket_threshold,ticket_bonus,team_commission_per_sale,team_advanced1_members,team_advanced1_sales,team_advanced1_commission,team_advanced2_members,team_advanced2_sales,team_advanced2_commission,commission_none,commission_bronze,commission_silver,commission_gold,monthly_bronze_sales,monthly_silver_sales,monthly_gold_sales,fixed_bronze_sales,fixed_silver_sales,fixed_gold_sales,affiliate_hydrant_price,affiliate_stick_price&limit=1'),
      supabaseFetch(`/rest/v1/affiliate_withdrawals?affiliate_id=eq.${affiliate.id}&source=eq.personal&select=amount,status&limit=1000`),
      supabaseFetch(`/rest/v1/affiliate_team_boosts?affiliate_id=eq.${affiliate.id}&select=price,status&limit=1000`).catch(() => []),
      supabaseFetch(`/rest/v1/affiliate_product_purchases?affiliate_id=eq.${affiliate.id}&select=product,status,price,created_at&limit=5000`)
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
    // Reutiliza a mesma reconciliação e os mesmos snapshots do saque pessoal.
    // Assim a compra valida o saldo com a mesma comissão que o painel e o saque exibem.
    const ordersPath = `/rest/v1/affiliate_orders?affiliate_id=eq.${affiliate.id}&select=yampi_order_id,status,total,commission,commission_level_snapshot,commission_base_snapshot,team_commission_snapshot,created_at,updated_at&order=created_at.desc&limit=5000`;
    const initialOrders = await supabaseFetch(ordersPath);
    await reconcileAffiliateOrderCommissions(supabaseFetch, affiliate.id, settings, {
      teamJoinedAt: affiliate.team_joined_at,
    }).catch(() => null);
    const reconciledOrders = await supabaseFetch(ordersPath);
    const earned = commissionForOrders(reconciledOrders || initialOrders || [], settings, { teamJoinedAt: affiliate.team_joined_at }).total;
    const reservedWithdrawals = (withdrawals || []).filter(w => !['rejected','failed'].includes(String(w.status || ''))).reduce((n,w)=>n+Number(w.amount||0),0);
    const reservedBoosts = (boosts || []).filter(b => ['queued','active','completed'].includes(String(b.status || ''))).reduce((n,b)=>n+Number(b.price||0),0);
    const reservedPurchases = (openPurchases || []).filter(p => !['rejected','cancelled'].includes(String(p.status || '').toLowerCase())).reduce((n,p)=>n+Number(p.price||0),0);
    const price = money(product === 'hydrant' ? (row.affiliate_hydrant_price ?? 80) : (row.affiliate_stick_price ?? 100));
    if (earned - reservedWithdrawals - reservedBoosts - reservedPurchases < price) return json(res, 400, { error: 'Saldo disponível insuficiente para esta compra.' });
    const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date()).slice(0,7);
    const monthRows = await supabaseFetch(`/rest/v1/affiliate_product_purchases?affiliate_id=eq.${affiliate.id}&product=eq.${product}&created_at=gte.${month}-01T00:00:00-03:00&status=not.in.(rejected,cancelled)&select=id&limit=1`);
    if (monthRows?.length) return json(res, 409, { error: 'Você já solicitou este produto neste mês.' });
    const rows = await supabaseFetch('/rest/v1/affiliate_product_purchases', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ affiliate_id: Number(affiliate.id), product, price, status: 'pending', freight_amount: FREIGHT_VALUE, freight_paid: false, full_name: name, cpf, cep, address, street, house_number, complement, neighborhood, city, state, email, phone, notes }) });
    const purchase = rows?.[0];
    if (!purchase) return json(res, 500, { error: 'Não foi possível registrar a solicitação.' });
    try {
      const withCharge = await createFreightCharge(purchase, affiliate);
      return json(res, 201, { purchase: withCharge, freight: { amount: FREIGHT_VALUE, paymentUrl: withCharge.freight_payment_url, paid: false } });
    } catch (chargeError) {
      // Keep the product amount reserved; the affiliate can retry link creation from the request card.
      return json(res, 201, { purchase, freight: { amount: FREIGHT_VALUE, paymentUrl: null, paid: false, error: chargeError.message } });
    }
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível processar a solicitação.' });
  }
};

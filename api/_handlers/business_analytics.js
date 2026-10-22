const { requireAdmin, supabaseFetch } = require('../_lib/admin');
const { json } = require('../_lib/supabase');
const { yampiFetch, getConfig: getYampiConfig, getOrderId, getStatus, isPaymentApprovedOrder, getTotal, getCreatedAt, getMetadata } = require('../_lib/yampi');
const EXPENSES = '/rest/v1/she_finance_entries';
const SETTINGS = '/rest/v1/she_finance_settings';
const BUSINESS_ORDERS = '/rest/v1/she_business_orders';
const BUSINESS_SYNC_STATE = '/rest/v1/she_business_sync_state';
const money = n => Number.isFinite(Number(n)) ? Number(n) : 0;
function monthBounds(month) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) { const d = new Date(); month = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
  const [y,m] = month.split('-').map(Number);
  return { month, start: `${month}-01`, end: new Date(Date.UTC(y,m,1)).toISOString().slice(0,10) };
}
async function readSettings() {
  try { const rows = await supabaseFetch(`${SETTINGS}?id=eq.1&select=*&limit=1`); return rows?.[0] || { tax_percent: 0, fee_percent: 0 }; }
  catch (e) { if (e.statusCode === 404 || e.data?.code === 'PGRST205') return { tax_percent: 0, fee_percent: 0 }; throw e; }
}
async function readEntries(start, end) {
  try { return await supabaseFetch(`${EXPENSES}?competence=gte.${start.slice(0,7)}-01&competence=lt.${end.slice(0,7)}-01&select=*&order=date.desc`); }
  catch (e) { if (e.statusCode === 404 || e.data?.code === 'PGRST205') { const err = new Error('Tabelas financeiras ainda não criadas. Execute supabase/migration_business_analytics.sql no SQL Editor.'); err.statusCode=503; throw err; } throw e; }
}
async function metaInsights(month) {
  const token = String(process.env.META_ACCESS_TOKEN || '').trim();
  const account = String(process.env.META_AD_ACCOUNT_ID || '').trim().replace(/^act_/, '');
  if (!token || !account) return { configured: false, campaigns: [], summary: {} };
  const [year, mon] = month.split('-').map(Number); const since = `${month}-01`; const until = new Date(Date.UTC(year,mon,0)).toISOString().slice(0,10);
  const base = `https://graph.facebook.com/${process.env.META_GRAPH_VERSION || 'v23.0'}`;
  const fields = 'campaign_id,campaign_name,spend,impressions,clicks,inline_link_clicks,actions,action_values,cpm,ctr,cpc';
  const params = new URLSearchParams({ access_token: token, level: 'campaign', fields, time_range: JSON.stringify({ since, until }), limit: '500' });
  const [insightsRes, campaignsRes] = await Promise.all([
    fetch(`${base}/act_${account}/insights?${params}`),
    fetch(`${base}/act_${account}/campaigns?${new URLSearchParams({access_token:token,fields:'id,name,status,effective_status,daily_budget,lifetime_budget',limit:'500'})}`),
  ]);
  const insightsBody = await insightsRes.json(); const campaignsBody = await campaignsRes.json();
  if (!insightsRes.ok) throw new Error(insightsBody?.error?.message || `Meta Insights HTTP ${insightsRes.status}`);
  if (!campaignsRes.ok) throw new Error(campaignsBody?.error?.message || `Meta Campaigns HTTP ${campaignsRes.status}`);
  const insights = insightsBody.data || []; const campaignMap = new Map((campaignsBody.data || []).map(c=>[String(c.id),c]));
  const actionCount = (arr, keys) => (arr || []).filter(a=>keys.includes(a.action_type)).reduce((s,a)=>s+Number(a.value||0),0);
  const rows = insights.map(i=>{
    const campaign=campaignMap.get(String(i.campaign_id))||{}; const purchases=actionCount(i.actions,['purchase','omni_purchase','offsite_conversion.fb_pixel_purchase']); const revenue=actionCount(i.action_values,['purchase','omni_purchase','offsite_conversion.fb_pixel_purchase']);
    return {id:i.campaign_id,name:i.campaign_name,status:campaign.effective_status||campaign.status||'—',budget:campaign.daily_budget?Number(campaign.daily_budget)/100:campaign.lifetime_budget?Number(campaign.lifetime_budget)/100:0,spend:money(i.spend),impressions:money(i.impressions),clicks:money(i.inline_link_clicks||i.clicks),purchases,revenue};
  });
  const summary=rows.reduce((a,c)=>({spend:a.spend+c.spend,impressions:a.impressions+c.impressions,clicks:a.clicks+c.clicks,purchases:a.purchases+c.purchases,attributedRevenue:a.attributedRevenue+c.revenue}),{spend:0,impressions:0,clicks:0,purchases:0,attributedRevenue:0});
  return { configured:true,campaigns:rows,summary,sourceLabel:'Meta Marketing API · período selecionado' };
}
function isCancelledBusinessStatus(status) {
  return /cancel|canceled|cancelled|refund|estorn|chargeback|payment_denied|payment_failed|recusad/.test(String(status || '').toLowerCase());
}

async function readBusinessSyncState() {
  try {
    const rows = await supabaseFetch(`${BUSINESS_SYNC_STATE}?id=eq.1&select=*&limit=1`);
    return rows?.[0] || { id: 1, scroll_id: null, completed: false, history_imported: false, synced_orders: 0, scanned_orders: 0 };
  } catch (e) {
    if (e.statusCode === 404 || e.data?.code === 'PGRST205') {
      const err = new Error('Tabela de sincronização financeira ainda não criada. Execute supabase/migration_business_analytics.sql no SQL Editor do Supabase.');
      err.statusCode = 503;
      throw err;
    }
    throw e;
  }
}

async function saveBusinessSyncState(state) {
  const payload = { id: 1, ...state, updated_at: new Date().toISOString() };
  await supabaseFetch(`${BUSINESS_SYNC_STATE}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(payload),
  });
}

async function syncAllYampiOrders() {
  const config = getYampiConfig();
  if (!config.configured) {
    const err = new Error('Integração Yampi não configurada no Vercel. Confira YAMPI_USER_TOKEN e YAMPI_USER_SECRET_KEY.');
    err.statusCode = 503;
    throw err;
  }

  let state = await readBusinessSyncState();
  // First pass imports the entire scroll history in bounded batches. After the
  // historical import is complete, later syncs refresh only the newest batch.
  const refreshOnly = Boolean(state.history_imported);
  if (state.completed) {
    state = { id: 1, scroll_id: null, completed: false, history_imported: refreshOnly, synced_orders: 0, scanned_orders: 0, cycle_started_at: new Date().toISOString() };
    await saveBusinessSyncState(state);
  } else if (!state.cycle_started_at) {
    state.cycle_started_at = new Date().toISOString();
  }

  let scrollId = String(state.scroll_id || '');
  let scannedThisRun = 0;
  let upsertedThisRun = 0;
  let pagesThisRun = 0;
  const maxPagesPerRun = Math.max(1, Math.min(10, Number(process.env.YAMPI_BUSINESS_SYNC_PAGES_PER_RUN || 8)));

  while (pagesThisRun < maxPagesPerRun) {
    const params = new URLSearchParams({ scroll: 'true', limit: '100', include: 'metadata,transactions' });
    if (scrollId) params.set('scroll_id', scrollId);
    const response = await yampiFetch(`/orders?${params.toString()}`);
    const orders = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
    pagesThisRun += 1;
    if (!orders.length) {
      state = { ...state, scroll_id: null, completed: true, history_imported: true, completed_at: new Date().toISOString() };
      await saveBusinessSyncState(state);
      break;
    }

    const nextScrollId = String(response?.scroll_id || response?.meta?.scroll_id || response?.data?.scroll_id || '');
    const records = [];
    for (const order of orders) {
      const id = getOrderId(order);
      if (id == null || id === '') continue;
      const status = getStatus(order) || 'created';
      const cancelled = isCancelledBusinessStatus(status);
      const paymentApproved = isPaymentApprovedOrder(order) || /refund|chargeback|payment_refunded|estorn/.test(status);
      const createdAt = getCreatedAt(order);
      const updatedRaw = order?.updated_at?.date || order?.updated_at || order?.modified_at?.date || order?.modified_at || null;
      const parsedUpdated = updatedRaw ? new Date(String(updatedRaw).replace(' ', 'T')) : null;
      const updatedAt = parsedUpdated && !Number.isNaN(parsedUpdated.getTime()) ? parsedUpdated.toISOString() : null;
      const affiliateMetadata = Number(getMetadata(order, 'affiliate_id')) || null;
      records.push({
        yampi_order_id: String(id),
        order_number: String(order?.number ?? order?.code ?? id),
        status,
        payment_approved: Boolean(paymentApproved),
        cancelled: Boolean(cancelled),
        total: getTotal(order),
        created_at: createdAt || new Date().toISOString(),
        ...(updatedAt ? { yampi_updated_at: updatedAt } : {}),
        affiliate_id: affiliateMetadata,
        raw_payload: order,
        synced_at: new Date().toISOString(),
      });
    }

    if (records.length) {
      await supabaseFetch(`${BUSINESS_ORDERS}?on_conflict=yampi_order_id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(records),
      });
      upsertedThisRun += records.length;
    }

    scannedThisRun += orders.length;
    scrollId = nextScrollId;
    state = {
      ...state,
      id: 1,
      scroll_id: scrollId || null,
      completed: !scrollId || (refreshOnly && pagesThisRun >= maxPagesPerRun),
      history_imported: Boolean(state.history_imported || !scrollId || refreshOnly),
      scanned_orders: Number(state.scanned_orders || 0) + orders.length,
      synced_orders: Number(state.synced_orders || 0) + records.length,
      cycle_started_at: state.cycle_started_at || new Date().toISOString(),
      ...((!scrollId || (refreshOnly && pagesThisRun >= maxPagesPerRun)) ? { completed_at: new Date().toISOString(), scroll_id: null } : {}),
    };
    // Persist cursor after every page, so timeouts can resume without losing progress.
    await saveBusinessSyncState(state);
    if (!scrollId || (refreshOnly && pagesThisRun >= maxPagesPerRun)) break;
  }

  return {
    ok: true,
    configured: true,
    pages_this_run: pagesThisRun,
    scanned_this_run: scannedThisRun,
    upserted_this_run: upsertedThisRun,
    total_scanned_in_cycle: Number(state.scanned_orders || 0),
    total_upserted_in_cycle: Number(state.synced_orders || 0),
    completed: Boolean(state.completed),
    message: state.completed ? 'Sincronização completa de todos os pedidos encontrados na Yampi.' : 'Lote sincronizado. Clique novamente em sincronizar para continuar o histórico.',
    last_synced_at: state.updated_at || new Date().toISOString(),
  };
}

function orderItems(order) {
  const candidates = [order?.items?.data, order?.items, order?.products?.data, order?.products, order?.order_items?.data, order?.order_items];
  for (const value of candidates) if (Array.isArray(value)) return value;
  return [];
}
function normalizeProductCode(value) { return String(value ?? '').trim().toUpperCase(); }
function nestedObject(value) { return value?.data || value || {}; }
function itemCodes(item) {
  const product = nestedObject(item?.product || item?.product_data);
  const sku = nestedObject(item?.sku);
  const variant = nestedObject(item?.variant);
  return [item?.product_token, item?.sku_token, item?.token, item?.code, item?.sku, item?.product?.token,
    product?.token, product?.checkout_token, product?.code, sku?.token, sku?.code, sku?.sku,
    variant?.token, variant?.sku_token].filter(v => typeof v === 'string' && v.trim()).map(normalizeProductCode);
}
async function loadBusinessProductCatalog() {
  let internal = [];
  try { internal = await supabaseFetch('/rest/v1/she_cart_products?select=id,name,yampi_token,image_url,active&order=name.asc'); }
  catch (e) { if (!(e.statusCode === 404 || e.data?.code === 'PGRST205')) throw e; }
  const byToken = new Map((internal || []).map(p => [normalizeProductCode(p.yampi_token), p]));
  const byYampiId = new Map();
  // Order line items often contain Yampi numeric product/SKU IDs instead of the
  // checkout token saved in the product manager. Resolve those IDs via catalog.
  try {
    for (let page = 1; page <= 10; page += 1) {
      const response = await yampiFetch(`/catalog/products?${new URLSearchParams({page:String(page),limit:'100',include:'skus'}).toString()}`);
      const list = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      for (const product of list) {
        const prod = nestedObject(product);
        const productTokens = [prod?.token, prod?.checkout_token, prod?.code].filter(Boolean).map(normalizeProductCode);
        const linked = productTokens.map(t=>byToken.get(t)).find(Boolean);
        const record = { name: linked?.name || prod?.name || prod?.title || null, image_url: linked?.image_url || prod?.image_url || prod?.image?.url || null, token: linked?.yampi_token || productTokens[0] || null };
        if (prod?.id != null) byYampiId.set(String(prod.id), record);
        const skus = Array.isArray(prod?.skus?.data) ? prod.skus.data : Array.isArray(prod?.skus) ? prod.skus : [];
        for (const skuValue of skus) {
          const sku = nestedObject(skuValue);
          const skuTokens = [sku?.token, sku?.checkout_token, sku?.code, sku?.sku].filter(Boolean).map(normalizeProductCode);
          const skuLinked = skuTokens.map(t=>byToken.get(t)).find(Boolean) || linked;
          const skuRecord = { name: skuLinked?.name || sku?.name || record.name, image_url: skuLinked?.image_url || record.image_url, token: skuLinked?.yampi_token || skuTokens[0] || record.token };
          if (sku?.id != null) byYampiId.set(String(sku.id), skuRecord);
          if (sku?.product_id != null && !byYampiId.has(String(sku.product_id))) byYampiId.set(String(sku.product_id), record);
        }
      }
      const pagination = response?.meta?.pagination || response?.pagination;
      const totalPages = Number(pagination?.total_pages || pagination?.totalPages || 0);
      if (!list.length || (totalPages && page >= totalPages) || list.length < 100) break;
    }
  } catch (e) { console.warn('[She Business Analytics] Yampi catalog lookup failed:', e.message); }
  return { byToken, byYampiId };
}
function summarizeProducts(rows, catalog = { byToken: new Map(), byYampiId: new Map() }) {
  const products = new Map();
  for (const order of rows || []) {
    if (!order.payment_approved || order.cancelled) continue;
    const raw = order.raw_payload || {};
    for (const item of orderItems(raw)) {
      const product = nestedObject(item?.product || item?.product_data);
      const sku = nestedObject(item?.sku);
      const variant = nestedObject(item?.variant);
      const numericIds = [item?.product_id, product?.id, sku?.product_id, sku?.id, item?.sku_id, variant?.id].filter(v => v != null).map(String);
      const codes = itemCodes(item);
      const internalMatch = codes.map(code => catalog.byToken.get(code)).find(Boolean);
      const catalogMatch = numericIds.map(id => catalog.byYampiId.get(id)).find(Boolean);
      const linkedProduct = internalMatch || (catalogMatch?.token ? catalog.byToken.get(normalizeProductCode(catalogMatch.token)) : null);
      const name = String(linkedProduct?.name || catalogMatch?.name || item?.name || item?.product_name || product?.name || sku?.name || variant?.name || item?.title || 'Produto sem nome').trim();
      const id = String(linkedProduct?.id || catalogMatch?.token || numericIds[0] || codes[0] || name);
      const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? item?.amount ?? 1) || 1);
      const lineTotal = Number(item?.total ?? item?.value_total ?? item?.price_total ?? item?.subtotal ?? ((Number(item?.price ?? item?.value ?? 0) || 0) * quantity)) || 0;
      const key = `${id}:${name}`;
      const current = products.get(key) || { id, name, image_url: linkedProduct?.image_url || catalogMatch?.image_url || null, quantity: 0, revenue: 0 };
      current.quantity += quantity;
      current.revenue += lineTotal;
      products.set(key, current);
    }
  }
  return [...products.values()].sort((a,b)=>b.quantity-a.quantity).map(p=>({...p,revenue:Math.round(p.revenue*100)/100}));
}
async function accessSummary(month, start, end) {
  const from = `${start}T00:00:00.000Z`;
  const to = `${end}T00:00:00.000Z`;
  try {
    const [siteEvents, affiliateEvents] = await Promise.all([
      supabaseFetch(`/rest/v1/she_site_events?created_at=gte.${encodeURIComponent(from)}&created_at=lt.${encodeURIComponent(to)}&select=visitor_id,session_id,created_at&limit=10000`),
      supabaseFetch(`/rest/v1/affiliate_events?created_at=gte.${encodeURIComponent(from)}&created_at=lt.${encodeURIComponent(to)}&type=eq.access&select=visitor_id,created_at&limit=10000`),
    ]);
    const normalSessions = new Set((siteEvents || []).map(e=>e.session_id).filter(Boolean));
    const affiliateSessions = new Set((affiliateEvents || []).map(e=>`${e.visitor_id || 'unknown'}:${String(e.created_at || '').slice(0,10)}`));
    return { configured: true, normal_accesses: normalSessions.size, affiliate_accesses: affiliateSessions.size, total_accesses: normalSessions.size + affiliateSessions.size, source: 'She site tracking + affiliate tracking' };
  } catch (e) {
    if (e.statusCode === 404 || e.data?.code === 'PGRST205') return { configured: false, normal_accesses: 0, affiliate_accesses: 0, total_accesses: 0, message: 'Execute a migração atualizada do painel de negócios e aguarde novos acessos para começar a coleta.' };
    throw e;
  }
}

async function yampiSummary(month) {
  const start = `${month}-01T00:00:00.000Z`;
  const [year, mon] = month.split('-').map(Number);
  const end = new Date(Date.UTC(year, mon, 1)).toISOString();
  try {
    const [rows, catalog] = await Promise.all([
      supabaseFetch(`${BUSINESS_ORDERS}?created_at=gte.${encodeURIComponent(start)}&created_at=lt.${encodeURIComponent(end)}&select=yampi_order_id,status,payment_approved,cancelled,total,created_at,affiliate_id,raw_payload&limit=10000`),
      loadBusinessProductCatalog(),
    ]);
    let gross = 0, refunds = 0, paid = 0, cancelledOrders = 0;
    for (const order of rows || []) {
      const total = money(order.total);
      if (order.payment_approved) gross += total;
      if (order.cancelled) {
        cancelledOrders += 1;
        if (order.payment_approved) refunds += total;
      } else if (order.payment_approved) {
        paid += 1;
      }
    }
    return {
      configured: true,
      gross_revenue: gross,
      refunds,
      paid_orders: paid,
      order_count: (rows || []).length,
      cancelled_orders: cancelledOrders,
      products: summarizeProducts(rows, catalog),
      source: 'she_business_orders',
    };
  } catch (e) {
    if (e.statusCode === 404 || e.data?.code === 'PGRST205') {
      const err = new Error('Tabela de pedidos financeiros ainda não criada. Execute supabase/migration_business_analytics.sql no SQL Editor do Supabase.');
      err.statusCode = 503;
      throw err;
    }
    throw e;
  }
}

module.exports = async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try {
    await requireAdmin(req);
    const view=String(req.query?.view||''); const month=String(req.query?.month||new Date().toISOString().slice(0,7));
    if(view==='sync-yampi' && req.method==='POST') { const result = await syncAllYampiOrders(); return json(res,200,result); }
    if(view==='traffic' && req.method==='GET') { const meta=await metaInsights(month); return json(res,200,{ok:true,...meta}); }
    if(view==='business' && req.method==='GET') {
      const bounds=monthBounds(month); const [settings,entries,yampi,meta,syncState,accesses]=await Promise.all([readSettings(),readEntries(bounds.start,bounds.end),yampiSummary(month),metaInsights(month),readBusinessSyncState(),accessSummary(month,bounds.start,bounds.end)]);
      const manualExpenses=(entries||[]).filter(e=>e.kind==='expense' && e.status==='paid').reduce((s,e)=>s+money(e.amount),0);
      const manualIncome=(entries||[]).filter(e=>e.kind==='income' && e.status==='paid').reduce((s,e)=>s+money(e.amount),0);
      // Manual income entries (e.g. reseller, Mercado Livre and Amazon) are already net of marketplace fees/freight.
      // Include them in revenue, but apply the Yampi/Appmax fee percentage only to Yampi revenue.
      const yampiGross=money(yampi.gross_revenue); const gross=yampiGross+manualIncome;
      const tax=gross*money(settings.tax_percent)/100; const fees=yampiGross*money(settings.fee_percent)/100; const adSpend=money(meta.summary?.spend);
      const variableCategories = new Set(['cmv','frete','custo do produto','embalagem','frete subsidiado','comissões','comissao','comissões de afiliadas','custo variável','custos variáveis']);
      const manualVariableCosts=(entries||[]).filter(e=>e.kind==='expense' && e.status==='paid' && variableCategories.has(String(e.category||'').trim().toLowerCase())).reduce((sum,e)=>sum+money(e.amount),0);
      const net=gross-money(yampi.refunds)-tax-fees; const result=net-manualExpenses-adSpend;
      const contribution=gross-money(yampi.refunds)-tax-fees-manualVariableCosts-adSpend;
      const conversion=accesses.total_accesses>0 ? (money(yampi.paid_orders)/accesses.total_accesses)*100 : 0;
      return json(res,200,{ok:true,settings,entries:entries||[],yampi,accesses,conversion:{orders:money(yampi.paid_orders),accesses:accesses.total_accesses,percent:conversion},syncState:{completed:Boolean(syncState.completed),scanned_orders:Number(syncState.scanned_orders||0),synced_orders:Number(syncState.synced_orders||0),updated_at:syncState.updated_at||null},metaConfigured:meta.configured,summary:{gross_revenue:gross,yampi_gross_revenue:yampiGross,manual_revenue:manualIncome,refunds:money(yampi.refunds),tax_amount:tax,fee_amount:fees,net_revenue:net,expenses:manualExpenses,income:manualIncome,ad_spend:adSpend,variable_costs:manualVariableCosts,contribution_margin:contribution,contribution_margin_percent:gross>0?(contribution/gross)*100:0,result}});
    }
    if(view==='expenses' && req.method==='POST') {
      const b=req.body||{}; const kind=['income','expense'].includes(b.kind)?b.kind:null; const amount=Number(b.amount); const date=String(b.date||''); const competence=String(b.competence||'');
      if(!kind || !String(b.description||'').trim() || !Number.isFinite(amount)||amount<=0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{4}-\d{2}$/.test(competence)) return json(res,400,{error:'Confira tipo, descrição, valor, data e competência.'});
      const rows=await supabaseFetch(EXPENSES,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify({kind,description:String(b.description).trim().slice(0,200),category:String(b.category||'Outros').slice(0,80),amount,date,competence:`${competence}-01`,status:b.status==='pending'?'pending':'paid',source:'manual',created_at:new Date().toISOString(),updated_at:new Date().toISOString()})});
      return json(res,201,{ok:true,entry:rows?.[0]||null});
    }
    if(view==='settings' && req.method==='POST') {
      const b=req.body||{}; const tax=Number(b.tax_percent), fee=Number(b.fee_percent); if(!Number.isFinite(tax)||!Number.isFinite(fee)||tax<0||fee<0||tax>100||fee>100)return json(res,400,{error:'Percentuais devem ficar entre 0 e 100.'});
      const current=await readSettings(); const payload={id:1,tax_percent:tax,fee_percent:fee,updated_at:new Date().toISOString()};
      const rows=await supabaseFetch(`${SETTINGS}?id=eq.1`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
      if(!rows?.length) { const inserted=await supabaseFetch(SETTINGS,{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}); return json(res,200,{ok:true,settings:inserted?.[0]||payload}); }
      return json(res,200,{ok:true,settings:rows[0]});
    }
    return json(res,405,{error:'Método ou visão não suportados.'});
  } catch(e) { console.error('[She Business Analytics]',e); return json(res,e.statusCode||500,{error:e.message||'Erro interno.'}); }
};

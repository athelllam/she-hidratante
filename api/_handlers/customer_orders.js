const { supabaseFetch } = require('../_lib/supabase');
const { yampiFetch, getStatus, getTotal, getCreatedAt } = require('../_lib/yampi');
const BUSINESS_ORDERS = '/rest/v1/she_business_orders';

// Lightweight per-instance throttle. The endpoint returns only the orders that match
// the submitted CPF and never exposes the raw Yampi payload to the browser.
const attempts = new Map();
function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}
function allowAttempt(req) {
  const now = Date.now();
  const key = clientKey(req);
  const entry = attempts.get(key) || { count: 0, start: now };
  if (now - entry.start > 15 * 60 * 1000) { entry.count = 0; entry.start = now; }
  entry.count += 1;
  attempts.set(key, entry);
  if (attempts.size > 5000) for (const [k, v] of attempts) if (now - v.start > 15 * 60 * 1000) attempts.delete(k);
  return entry.count <= 8;
}
function digits(value) { return String(value || '').replace(/\D/g, ''); }
function validCpf(value) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = length => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * ((length + 1) - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}
function collectObjects(value, depth = 0, out = []) {
  if (!value || typeof value !== 'object' || depth > 7 || out.length > 1500) return out;
  out.push(value);
  if (Array.isArray(value)) { for (const item of value) collectObjects(item, depth + 1, out); }
  else for (const item of Object.values(value)) if (item && typeof item === 'object') collectObjects(item, depth + 1, out);
  return out;
}
function firstField(objects, keys) {
  for (const obj of objects) for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) continue;
      return value;
    }
  }
  return null;
}
function customerCpf(order) {
  const objects = collectObjects(order);
  for (const obj of objects) {
    for (const key of ['cpf', 'document', 'document_number', 'cpf_cnpj', 'tax_id', 'doc']) {
      const value = obj?.[key];
      if (value && digits(value).length === 11) return digits(value);
    }
  }
  return '';
}
function unwrap(value) {
  let current = value;
  for (let i = 0; i < 4; i += 1) {
    if (Array.isArray(current)) return current[0] || null;
    if (!current || typeof current !== 'object' || !current.data) return current && typeof current === 'object' ? current : null;
    current = current.data;
  }
  return current && typeof current === 'object' ? current : null;
}
function itemList(order) {
  const candidates = [order?.items?.data, order?.items, order?.products?.data, order?.products, order?.order_items?.data, order?.order_items];
  const list = candidates.find(Array.isArray) || [];
  return list.map(item => {
    const product = unwrap(item?.product) || {};
    const variant = unwrap(item?.variant) || {};
    const qty = Number(item?.quantity ?? item?.qty ?? 1) || 1;
    const price = Number(item?.price ?? item?.value ?? item?.unit_price ?? item?.total ?? 0) || 0;
    const title = item?.name || item?.title || product?.name || variant?.name || 'Produto She';
    return { name: String(title).slice(0, 160), quantity: qty, unit_price: price, total: Number((price * qty).toFixed(2)) };
  });
}
function statusLabel(order) {
  const status = unwrap(order?.status);
  return String(status?.name || status?.alias || status?.slug || order?.status_name || (typeof order?.status === 'string' ? order.status : '') || '');
}
function details(order) {
  const objects = collectObjects(order);
  const invoiceObject = objects.find(obj => obj && typeof obj === 'object' && (obj.invoice_number || obj.nfe_number || obj.access_key || obj.invoice_url || obj.danfe_url || obj.chave_acesso)) || {};
  const invoiceNumber = invoiceObject.invoice_number || invoiceObject.number_nf || invoiceObject.nfe_number || invoiceObject.invoiceNumber || invoiceObject.fiscal_number || null;
  const invoiceKey = invoiceObject.invoice_key || invoiceObject.access_key || invoiceObject.nfe_key || invoiceObject.invoice_access_key || invoiceObject.chave_acesso || null;
  const invoiceUrl = invoiceObject.invoice_url || invoiceObject.nfe_url || invoiceObject.danfe_url || invoiceObject.url_invoice || invoiceObject.invoice_pdf_url || invoiceObject.pdf_url || invoiceObject.xml_url || null;
  const trackingCode = firstField(objects, ['tracking_code', 'tracking_number', 'trackingCode', 'tracking_number_code', 'code_tracking', 'codigo_rastreio']);
  const trackingUrl = firstField(objects, ['tracking_url', 'tracking_link', 'trackingUrl', 'url_tracking', 'link_rastreio', 'tracking_page']);
  const carrier = firstField(objects, ['shipping_company', 'carrier', 'shipping_name', 'delivery_method', 'shipping_method']);
  // These are balance-like fields only; order-level cashback amounts are not treated as wallet balance.
  const cashbackBalance = firstField(objects, ['cashback_balance', 'available_cashback', 'cashback_available', 'wallet_balance', 'balance_cashback']);
  const cashbackGenerated = firstField(objects, ['cashback_generated', 'cashback_amount', 'cashback_value', 'value_cashback', 'cashback_earned']);
  return {
    invoice: invoiceNumber || invoiceKey || invoiceUrl ? { number: invoiceNumber ? String(invoiceNumber) : null, key: invoiceKey ? String(invoiceKey) : null, url: safeUrl(invoiceUrl) } : null,
    tracking: trackingCode || trackingUrl ? { code: trackingCode ? String(trackingCode) : null, url: safeUrl(trackingUrl), carrier: carrier ? String(carrier) : null } : null,
    cashback_balance: cashbackBalance !== null && Number.isFinite(Number(cashbackBalance)) ? Number(cashbackBalance) : null,
    cashback_generated: cashbackGenerated !== null && Number.isFinite(Number(cashbackGenerated)) ? Number(cashbackGenerated) : null,
  };
}
function safeUrl(value) {
  if (!value) return null;
  try { const u = new URL(String(value)); return ['https:', 'http:'].includes(u.protocol) ? u.toString() : null; } catch { return null; }
}
function publicOrder(row, liveOrder = null) {
  const order = liveOrder || row.raw_payload || {};
  const info = details(order);
  const id = row.yampi_order_id || order.id || order.number;
  const created = getCreatedAt(order) || row.created_at || null;
  const items = itemList(order);
  return {
    id: String(id || ''),
    number: String(order.number || order.code || row.order_number || id || ''),
    date: created,
    status: statusLabel(order) || row.status || 'Status não informado',
    payment_approved: Boolean(row.payment_approved),
    total: Number(row.total ?? getTotal(order) ?? 0) || 0,
    items,
    invoice: info.invoice,
    tracking: info.tracking,
    cashback_generated: info.cashback_generated,
    cashback_balance: info.cashback_balance,
  };
}

async function tryCustomerCashback(order) {
  const objects = collectObjects(order);
  const customer = objects.find(obj => obj && (obj.email || obj.document || obj.cpf) && (obj.id || obj.customer_id));
  const customerId = customer?.id || customer?.customer_id || firstField(objects, ['customer_id']);
  if (!customerId) return null;
  try {
    const response = await yampiFetch(`/customers/${encodeURIComponent(customerId)}`);
    const customerData = unwrap(response) || {};
    const balance = firstField(collectObjects(customerData), ['cashback_balance', 'available_cashback', 'cashback_available', 'wallet_balance', 'balance_cashback']);
    return balance !== null && Number.isFinite(Number(balance)) ? Number(balance) : null;
  } catch (error) {
    // Some Yampi plans/API versions do not expose the customer's cashback wallet.
    console.warn('[She Customer Orders] Saldo de cashback não disponível pela API:', error.message);
    return null;
  }
}

module.exports = async function customerOrders(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  if (!allowAttempt(req)) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' });
  try {
    const cpf = digits(req.body?.cpf);
    if (!validCpf(cpf)) return res.status(400).json({ error: 'Informe um CPF válido.' });
    const rows = await supabaseFetch(`${BUSINESS_ORDERS}?select=yampi_order_id,order_number,status,payment_approved,cancelled,total,created_at,raw_payload&order=created_at.desc&limit=10000`);
    const matches = (rows || []).filter(row => customerCpf(row.raw_payload) === cpf && !row.cancelled);
    if (!matches.length) return res.status(200).json({ ok: true, orders: [], cashback_balance: null, message: 'Não encontramos pedidos para esse CPF. Se a compra foi recente, tente novamente em alguns minutos.' });

    // Refresh details from Yampi for each matching order so invoice/tracking/status
    // added later by the Bling integration are reflected without creating shipments.
    const orders = await Promise.all(matches.slice(0, 50).map(async row => {
      let live = null;
      try {
        const response = await yampiFetch(`/orders/${encodeURIComponent(row.yampi_order_id)}?include=customer,items,transactions,metadata`);
        live = unwrap(response) || null;
      } catch (error) {
        console.warn('[She Customer Orders] Não foi possível atualizar detalhes Yampi:', error.message);
      }
      const order = publicOrder(row, live);
      if (order.cashback_balance === null && live) order.cashback_balance = await tryCustomerCashback(live);
      return order;
    }));
    const balance = orders.map(o => o.cashback_balance).find(v => v !== null && v !== undefined);
    return res.status(200).json({ ok: true, orders, cashback_balance: balance ?? null, cashback_balance_available: balance !== null && balance !== undefined });
  } catch (error) {
    console.error('[She Customer Orders]', error);
    return res.status(error.statusCode || 500).json({ error: 'Não foi possível consultar seus pedidos agora. Tente novamente mais tarde.' });
  }
};

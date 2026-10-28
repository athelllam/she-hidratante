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
  const candidates = [order?.items?.data, order?.items, order?.products?.data, order?.products, order?.order_items?.data, order?.order_items, order?.lines?.data, order?.lines];
  const list = candidates.find(Array.isArray) || [];
  return list.map(item => {
    const product = unwrap(item?.product || item?.product_data || item?.catalog_product) || {};
    const sku = unwrap(item?.sku || item?.variant || item?.variation) || {};
    const skuProduct = unwrap(sku?.product || sku?.product_data) || {};
    const productNested = unwrap(product?.product || product?.data) || product;
    const qty = Number(item?.quantity ?? item?.qty ?? item?.amount ?? item?.pivot?.quantity ?? 1) || 1;
    const unitPrice = Number(item?.price ?? item?.unit_price ?? item?.price_unit ?? item?.value ?? item?.original_price ?? item?.sku?.price ?? 0) || 0;
    const lineTotal = Number(item?.total ?? item?.value_total ?? item?.price_total ?? item?.subtotal ?? item?.total_price ?? item?.amount_total ?? (unitPrice * qty)) || 0;
    // Yampi sometimes sends a generic line-item name (e.g. "Produto She") while
    // the actual catalog title is nested under product/SKU. Prefer the specific title.
    const candidatesNames = [
      productNested?.name, productNested?.title, product?.name, product?.title,
      skuProduct?.name, skuProduct?.title, sku?.product_name, sku?.name, sku?.title,
      item?.product_name, item?.title, item?.name,
    ].map(v => String(v || '').trim()).filter(Boolean);
    const generic = /^(produto she|produto|item)$/i;
    const title = candidatesNames.find(name => !generic.test(name)) || candidatesNames[0] || 'Produto sem identificação';
    return { name: title.slice(0, 160), quantity: qty, unit_price: unitPrice || (qty ? lineTotal / qty : lineTotal), total: Number(lineTotal.toFixed(2)), sku: sku?.sku || sku?.code || item?.sku_code || null };
  });
}
function numericField(objects, keys) {
  const value = firstField(objects, keys);
  if (value === null) return null;
  const normalized = typeof value === 'string' ? value.replace(/R\$\s?/i, '').replace(/\./g, '').replace(',', '.') : value;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}
function orderFinancials(order) {
  const objects = collectObjects(order);
  // Prefer the order's own financial fields before searching nested objects,
  // because product and transaction objects may contain unrelated amounts.
  const root = order || {};
  const nested = objects.slice(1);
  const readAmount = (keys) => {
    const rootValue = numericField([root], keys);
    return rootValue !== null ? rootValue : numericField(nested, keys);
  };
  const subtotal = readAmount([
    'value_products', 'products_value', 'value_subtotal', 'subtotal', 'items_total',
    'products_total', 'total_products', 'subtotal_value', 'value_items', 'items_value'
  ]);
  const discount = readAmount([
    'value_discount', 'discount_value', 'discount_amount', 'discounts_total',
    'total_discount', 'discount', 'value_discounts'
  ]);
  const shipping = readAmount([
    'value_shipment', 'shipment_value', 'value_shipping', 'shipping_value',
    'shipping_amount', 'shipping_price', 'freight', 'freight_value', 'delivery_cost',
    'delivery_price', 'shipping_total', 'total_shipping', 'value_freight'
  ]);
  const interest = readAmount([
    'value_interest', 'interest_value', 'interest_amount', 'amount_interest', 'interest',
    'installment_interest', 'installments_interest', 'installment_fee', 'installments_fee',
    'value_installment_interest', 'value_interest_installments', 'value_juros', 'juros'
  ]);
  const total = Number(getTotal(order) || root.value_total || root.total || 0);
  const itemTotal = itemList(order).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const resolvedSubtotal = subtotal ?? (itemTotal || total);
  // The Yampi order API may omit the explicit interest field even when the
  // order detail screen shows installment interest. If all other components
  // are available, derive the interest as the residual of the final total.
  // total = products + shipping - discount + interest. Never infer it when
  // shipping/discount are missing, as that could mislabel another difference.
  let resolvedInterest = interest;
  if (resolvedInterest === null && subtotal !== null && shipping !== null && discount !== null && total > 0) {
    const derived = Number((total - subtotal - shipping + discount).toFixed(2));
    if (derived >= 0 && derived <= total) resolvedInterest = derived;
  }
  return { subtotal: resolvedSubtotal, discount, shipping, interest: resolvedInterest, total };
}
function statusLabel(order) {
  const status = unwrap(order?.status);
  return String(status?.name || status?.alias || status?.slug || order?.status_name || (typeof order?.status === 'string' ? order.status : '') || '');
}
function details(order) {
  const objects = collectObjects(order);
  const invoiceObject = objects.find(obj => obj && typeof obj === 'object' && (
    obj.invoice_number || obj.number_nf || obj.nfe_number || obj.access_key || obj.invoice_key ||
    obj.invoice_url || obj.danfe_url || obj.chave_acesso || obj.fiscal_document_number || obj.nfe
  )) || {};
  const invoiceNested = unwrap(order?.invoice || order?.fiscal_document || order?.nfe || order?.invoice_data) || {};
  const invoiceNumber = invoiceObject.invoice_number || invoiceObject.number_nf || invoiceObject.nfe_number ||
    invoiceObject.invoiceNumber || invoiceObject.fiscal_number || invoiceObject.fiscal_document_number ||
    invoiceNested.number || invoiceNested.number_nf || invoiceNested.invoice_number || invoiceNested.nfe_number || null;
  const invoiceKey = invoiceObject.invoice_key || invoiceObject.access_key || invoiceObject.nfe_key ||
    invoiceObject.invoice_access_key || invoiceObject.chave_acesso || invoiceNested.key || invoiceNested.access_key || invoiceNested.chave || null;
  const invoiceUrl = invoiceObject.invoice_url || invoiceObject.nfe_url || invoiceObject.danfe_url ||
    invoiceObject.url_invoice || invoiceObject.invoice_pdf_url || invoiceObject.pdf_url || invoiceObject.xml_url ||
    invoiceNested.url || invoiceNested.invoice_url || invoiceNested.nfe_url || invoiceNested.danfe_url || invoiceNested.pdf_url || null;

  const trackingNested = unwrap(order?.tracking || order?.tracking_data || order?.shipment || order?.shipping_tracking || order?.delivery_tracking) || {};
  const trackingCode = firstField(objects, [
    'tracking_code', 'tracking_number', 'trackingCode', 'tracking_number_code', 'code_tracking',
    'codigo_rastreio', 'tracking_code_number', 'shipment_tracking_code', 'object_code'
  ]) || trackingNested.code || trackingNested.tracking_code || trackingNested.tracking_number || null;
  const trackingUrl = firstField(objects, [
    'tracking_url', 'tracking_link', 'trackingUrl', 'url_tracking', 'link_rastreio', 'tracking_page',
    'tracking_url_customer', 'url_rastreio', 'track_url'
  ]) || trackingNested.url || trackingNested.tracking_url || trackingNested.tracking_link || trackingNested.link || null;
  const carrier = firstField(objects, ['shipping_company', 'carrier', 'shipping_name', 'delivery_method', 'shipping_method', 'carrier_name']) || trackingNested.carrier || trackingNested.shipping_company || null;
  const cashbackBalance = firstField(objects, ['cashback_balance', 'available_cashback', 'cashback_available', 'wallet_balance', 'balance_cashback', 'cashback_accumulated', 'accumulated_cashback', 'cashback_total', 'cashback_available_value', 'available_cashback_value']);
  const cashbackGenerated = firstField(objects, ['cashback_generated', 'cashback_amount', 'cashback_value', 'value_cashback', 'cashback_earned', 'cashback_accumulated_value', 'accumulated_cashback_value', 'cashback_credit']);
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
  const financials = orderFinancials(order);
  const objects = collectObjects(order);
  const paymentMethod = firstField(objects.slice(0, 25), ['payment_method_name', 'payment_method', 'method_name', 'gateway_name', 'payment_type']);
  const shippingMethod = firstField(objects.slice(0, 25), ['shipping_method_name', 'shipping_method', 'delivery_method', 'shipping_name', 'delivery_name']);
  const customerEmail = firstField(objects, ['email', 'customer_email']);
  const customerRoot = unwrap(order?.customer || order?.client || order?.buyer) || {};
  const customerName = customerRoot.name || customerRoot.full_name || customerRoot.first_name || firstField(objects.slice(0, 12), ['customer_name', 'full_name']);
  return {
    id: String(id || ''),
    number: String(order.number || order.code || row.order_number || id || ''),
    date: created,
    status: statusLabel(order) || row.status || 'Status não informado',
    payment_approved: Boolean(row.payment_approved || /paid|approved|aprovado|pago/i.test(statusLabel(order))),
    total: Number((liveOrder ? (getTotal(order) || financials.total) : (row.total ?? financials.total ?? getTotal(order))) || 0) || 0,
    subtotal: financials.subtotal,
    discount: financials.discount,
    shipping: financials.shipping,
    interest: financials.interest,
    payment_method: paymentMethod ? String(paymentMethod) : null,
    shipping_method: shippingMethod ? String(shippingMethod) : null,
    customer_email: customerEmail ? String(customerEmail) : null,
    customer_name: customerName ? String(customerName) : null,
    items,
    invoice: info.invoice,
    tracking: info.tracking,
    cashback_generated: info.cashback_generated,
    cashback_balance: info.cashback_balance,
  };
}

async function tryCustomerCashback(order) {
  const objects = collectObjects(order);
  const customerRoot = unwrap(order?.customer || order?.client || order?.buyer) || {};
  const customer = customerRoot.id ? customerRoot : objects.find(obj => obj && (obj.email || obj.document || obj.cpf) && (obj.customer_id || obj.id));
  const customerId = customerRoot.id || customer?.customer_id || customer?.id || firstField(objects.slice(0, 20), ['customer_id']);
  if (!customerId) return null;
  try {
    const response = await yampiFetch(`/customers/${encodeURIComponent(customerId)}?include=cashback,wallet,credits`);
    const customerData = unwrap(response) || {};
    const balance = firstField(collectObjects(customerData), ['cashback_balance', 'available_cashback', 'cashback_available', 'wallet_balance', 'balance_cashback', 'cashback_accumulated', 'accumulated_cashback', 'cashback_total', 'cashback_available_value', 'available_cashback_value']);
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

    // The finance sync is intentionally batched to respect Vercel execution limits.
    // Query the newest Yampi pages directly as well, so recent orders are visible
    // in Minhas Compras even while a long historical sync is still running.
    const liveById = new Map();
    try {
      for (let page = 1; page <= 4; page += 1) {
        const query = new URLSearchParams({ page: String(page), limit: '100', include: 'customer,items,transactions,metadata,shipping,invoice,tracking' });
        const response = await yampiFetch(`/orders?${query.toString()}`);
        const pageOrders = Array.isArray(response?.data?.data) ? response.data.data : Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        for (const order of pageOrders) {
          const id = order?.id ?? order?.number ?? order?.order_id ?? order?.code;
          if (id != null && customerCpf(order) === cpf) liveById.set(String(id), order);
        }
        const pagination = response?.meta?.pagination || response?.pagination || response?.data?.meta?.pagination;
        const totalPages = Number(pagination?.total_pages || pagination?.totalPages || 0);
        if (!pageOrders.length || pageOrders.length < 100 || (totalPages && page >= totalPages)) break;
      }
    } catch (error) {
      console.warn('[She Customer Orders] Não foi possível buscar pedidos recentes diretamente na Yampi:', error.message);
    }

    const rowsById = new Map();
    for (const row of rows || []) {
      if (row.cancelled || customerCpf(row.raw_payload) !== cpf) continue;
      rowsById.set(String(row.yampi_order_id), row);
    }
    for (const [id, live] of liveById) {
      const existing = rowsById.get(id) || {};
      rowsById.set(id, {
        ...existing,
        yampi_order_id: id,
        order_number: live.number || live.code || existing.order_number || id,
        status: getStatus(live) || existing.status,
        payment_approved: existing.payment_approved || /paid|approved|aprovado|pago/i.test(getStatus(live)),
        cancelled: /cancel|refund|estorn|chargeback/i.test(getStatus(live)),
        total: getTotal(live) || existing.total || 0,
        created_at: getCreatedAt(live) || existing.created_at,
        raw_payload: live,
      });
    }
    const matches = [...rowsById.values()].filter(row => !row.cancelled).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (!matches.length) return res.status(200).json({ ok: true, orders: [], cashback_balance: null, message: 'Não encontramos pedidos para esse CPF. Se a compra foi recente, tente novamente em alguns minutos.' });

    // Prefer the latest list payload (which already contains the item names) and
    // fetch details for older cached orders. This is read-only: it never creates shipments.
    const selectedMatches = matches.slice(0, 60);
    const orders = [];
    // Keep API concurrency low to avoid Yampi rate limits and Vercel timeouts.
    for (let offset = 0; offset < selectedMatches.length; offset += 5) {
      const batch = await Promise.all(selectedMatches.slice(offset, offset + 5).map(async row => {
      let live = liveById.get(String(row.yampi_order_id)) || null;
      const cachedPayload = row.raw_payload || {};
      const current = live || cachedPayload;
      const cachedItems = itemList(current);
      const currentDetails = details(current);
      const currentFinancials = orderFinancials(current);
      // The list endpoint often omits invoice/tracking and some financial fields.
      // Fetch the specific order when those fields are missing; this is read-only.
      const needsDetails = !cachedItems.length ||
        cachedItems.some(item => /^(produto she|produto sem identificação|produto)$/i.test(item.name)) ||
        currentFinancials.shipping === null || currentFinancials.discount === null ||
        currentFinancials.interest === null || !currentDetails.invoice || !currentDetails.tracking;
      if (needsDetails) {
        try {
          const response = await yampiFetch(`/orders/${encodeURIComponent(row.yampi_order_id)}?include=customer,items,transactions,metadata,shipping,invoice,tracking`);
          const full = unwrap(response) || null;
          if (full) live = { ...(live || {}), ...full };
        } catch (error) {
          console.warn('[She Customer Orders] Não foi possível atualizar detalhes Yampi:', error.message);
        }
      }
      const order = publicOrder(row, live || cachedPayload);
      if (order.cashback_balance === null && (live || row.raw_payload)) order.cashback_balance = await tryCustomerCashback(live || row.raw_payload);
      return order;
      }));
      orders.push(...batch);
    }
    const balance = orders.map(o => o.cashback_balance).find(v => v !== null && v !== undefined);
    const customerName = orders.map(order => order.customer_name).find(name => name && String(name).trim()) || null;
    return res.status(200).json({ ok: true, customer_name: customerName, orders, cashback_balance: balance ?? null, cashback_balance_available: balance !== null && balance !== undefined });
  } catch (error) {
    console.error('[She Customer Orders]', error);
    return res.status(error.statusCode || 500).json({ error: 'Não foi possível consultar seus pedidos agora. Tente novamente mais tarde.' });
  }
};

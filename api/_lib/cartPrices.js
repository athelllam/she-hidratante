const { yampiFetch } = require('./yampi');

const CART_TOKENS = new Set([
  'EFH0YOIDTO',
  '7B6B7IL4ZM',
  '6G99ZYJTDE',
  'IWK5ZWCEUO',
  'ORM1LRMTT5',
  'GVVB8UXHJ8',
]);

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function normalizeToken(value) {
  return String(value ?? '').trim().toUpperCase();
}

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function pricePairFromObject(item) {
  if (!item || typeof item !== 'object') return null;

  const saleKeys = [
    'price_sale',
    'sale_price',
    'priceSale',
    'preco_venda',
    'price',
  ];
  const promoKeys = [
    'price_discount',
    'discount_price',
    'promotional_price',
    'price_promotional',
    'priceDiscount',
    'preco_promocional',
  ];

  let sale = null;
  let promo = null;

  for (const key of saleKeys) {
    const value = toNumber(item?.[key]);
    if (value != null && value > 0) {
      sale = value;
      break;
    }
  }

  for (const key of promoKeys) {
    const value = toNumber(item?.[key]);
    if (value != null && value > 0) {
      promo = value;
      break;
    }
  }

  if (sale == null && promo == null) return null;
  if (sale == null) sale = promo;
  if (promo != null && promo >= sale) promo = null;

  return {
    salePrice: Number(sale.toFixed(2)),
    promotionalPrice: promo == null ? null : Number(promo.toFixed(2)),
    effectivePrice: Number((promo ?? sale).toFixed(2)),
  };
}

function findTokenInObject(item, wanted) {
  if (!item || typeof item !== 'object') return false;

  const tokenKeys = [
    'token',
    'checkout_token',
    'checkoutToken',
    'sku',
    'code',
    'identifier',
  ];

  return tokenKeys.some((key) => normalizeToken(item?.[key]) === wanted);
}

function collectMatchingNodes(value, wanted, output = [], seen = new Set()) {
  if (value == null || typeof value !== 'object' || seen.has(value)) return output;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectMatchingNodes(item, wanted, output, seen);
    return output;
  }

  if (findTokenInObject(value, wanted)) output.push(value);

  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') {
      collectMatchingNodes(child, wanted, output, seen);
    }
  }

  return output;
}

function extractPrices(node) {
  const direct = pricePairFromObject(node);
  if (direct) return direct;

  const preferredKeys = ['prices', 'price', 'pricing', 'sku', 'skus', 'data'];
  for (const key of preferredKeys) {
    const child = node?.[key];
    if (!child) continue;

    if (Array.isArray(child)) {
      for (const item of child) {
        const result = extractPrices(item);
        if (result) return result;
      }
    } else if (typeof child === 'object') {
      const result = extractPrices(child);
      if (result) return result;
    }
  }

  return null;
}

async function fetchProductPages() {
  const all = [];

  for (let page = 1; page <= 10; page += 1) {
    const params = new URLSearchParams({
      page: String(page),
      limit: '100',
      include: 'skus',
    });

    let response;
    try {
      response = await yampiFetch(`/catalog/products?${params.toString()}`);
    } catch (error) {
      if (page === 1) throw error;
      break;
    }

    const items = asArray(response);
    all.push(...items);

    const pagination = response?.meta?.pagination || response?.pagination;
    const totalPages = Number(pagination?.total_pages || pagination?.totalPages || 0);
    if (!items.length || (totalPages && page >= totalPages) || items.length < 100) break;
  }

  return all;
}

async function loadPrices(tokens) {
  const wanted = tokens.map(normalizeToken).filter((token) => CART_TOKENS.has(token));
  if (!wanted.length) return {};

  const products = await fetchProductPages();
  const result = {};

  for (const token of wanted) {
    const nodes = collectMatchingNodes(products, token);
    for (const node of nodes) {
      const prices = extractPrices(node);
      if (prices) {
        result[token] = prices;
        break;
      }
    }
  }

  return result;
}


module.exports = {
  CART_TOKENS,
  loadPrices,
};

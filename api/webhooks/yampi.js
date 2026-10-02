const { supabaseFetch, json } = require('../_lib/supabase');
const crypto = require('crypto');

function header(req, name) {
  return req.headers[name.toLowerCase()] || req.headers[name] || '';
}

async function readRawBody(req) {
  if (req.body !== undefined && req.body !== null && req.body !== '') return req.body;
  if (typeof req.on !== 'function') return null;

  return await new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      size += buffer.length;
      if (size <= 4.5 * 1024 * 1024) chunks.push(buffer);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseIncomingBody(rawBody, contentType = '') {
  if (rawBody == null) return {};
  if (Buffer.isBuffer(rawBody)) rawBody = rawBody.toString('utf8');
  if (typeof rawBody === 'object') return rawBody;
  if (typeof rawBody !== 'string') return {};
  const text = rawBody.trim();
  if (!text) return {};

  const type = String(contentType).toLowerCase();
  if (type.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(text);
    const out = {};
    for (const [key, value] of params.entries()) out[key] = value;
    return out;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function collectInterestingFields(value, path = '$', depth = 0, out = []) {
  if (depth > 6 || out.length >= 80 || value == null) return out;
  if (Array.isArray(value)) {
    value.slice(0, 20).forEach((item, index) => collectInterestingFields(item, `${path}[${index}]`, depth + 1, out));
    return out;
  }
  if (typeof value !== 'object') return out;

  for (const [key, child] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const childPath = `${path}.${key}`;
    if (['event', 'status', 'slug', 'alias', 'metadata', 'affiliate_id', 'order_id', 'number', 'code'].includes(lower)) {
      let safeValue = child;
      if (lower === 'metadata' && child && typeof child === 'object') {
        if (Array.isArray(child)) {
          safeValue = child.map(item => ({
            key: item?.key ?? item?.name ?? null,
            value: item?.key === 'affiliate_id' || item?.name === 'affiliate_id' ? item?.value ?? item?.content ?? null : '[omitted]',
          }));
        } else {
          safeValue = Object.fromEntries(Object.entries(child).map(([k, v]) => [
            k,
            String(k).toLowerCase() === 'affiliate_id' ? v : '[omitted]'
          ]));
        }
      }
      out.push({ path: childPath, key, value: safeValue });
    }
    collectInterestingFields(child, childPath, depth + 1, out);
    if (out.length >= 80) break;
  }
  return out;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current == null ? undefined : current[key], obj);
}

function findKeyMatches(value, wantedKeys, path = '$', depth = 0, out = []) {
  if (depth > 10 || out.length >= 200 || value == null) return out;
  const wanted = new Set(wantedKeys.map(k => String(k).toLowerCase()));

  if (Array.isArray(value)) {
    value.slice(0, 50).forEach((item, index) => {
      findKeyMatches(item, wantedKeys, `${path}[${index}]`, depth + 1, out);
    });
    return out;
  }

  if (typeof value !== 'object') return out;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (wanted.has(String(key).toLowerCase())) {
      let safeValue = child;
      const lower = String(key).toLowerCase();
      if (lower === 'metadata' && child && typeof child === 'object') {
        if (Array.isArray(child)) {
          safeValue = child.map(item => ({
            key: item?.key ?? item?.name ?? null,
            value: String(item?.key ?? item?.name ?? '').toLowerCase() === 'affiliate_id'
              ? item?.value ?? item?.content ?? null
              : '[omitted]',
          }));
        } else {
          safeValue = Object.fromEntries(Object.entries(child).map(([k, v]) => [
            k,
            String(k).toLowerCase() === 'affiliate_id' ? v : '[omitted]',
          ]));
        }
      }
      if (lower === 'raw_body') safeValue = '[omitted]';
      out.push({ path: childPath, key, value: safeValue });
    }
    findKeyMatches(child, wantedKeys, childPath, depth + 1, out);
    if (out.length >= 200) break;
  }
  return out;
}

function firstDeepValue(payload, keys) {
  const matches = findKeyMatches(payload, keys, '$', 0, []);
  return matches.length ? matches[0].value : null;
}

function findObjectWithKey(payload, key) {
  const wanted = String(key).toLowerCase();
  function walk(value, depth = 0) {
    if (depth > 10 || value == null || typeof value !== 'object') return null;
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 50)) {
        const found = walk(item, depth + 1);
        if (found) return found;
      }
      return null;
    }
    if (Object.keys(value).some(k => k.toLowerCase() === wanted)) return value;
    for (const child of Object.values(value)) {
      const found = walk(child, depth + 1);
      if (found) return found;
    }
    return null;
  }
  return walk(payload);
}

function getOrder(payload) {
  const directCandidates = [
    payload?.data?.order,
    payload?.order,
    payload?.data,
    payload,
  ];
  for (const candidate of directCandidates) {
    if (candidate && typeof candidate === 'object' && (
      candidate.id != null || candidate.number != null || candidate.order_id != null || candidate.code != null || candidate.metadata != null
    )) return candidate;
  }
  return findObjectWithKey(payload, 'metadata') || findObjectWithKey(payload, 'status') || payload;
}

function getMetadata(payload) {
  const candidates = [
    payload?.data?.order?.metadata,
    payload?.order?.metadata,
    payload?.data?.metadata,
    payload?.metadata,
  ];

  const readMetadata = (metadata) => {
    if (!metadata) return null;
    if (Array.isArray(metadata)) {
      for (const item of metadata) {
        const key = String(item?.key ?? item?.name ?? '').toLowerCase();
        if (key === 'affiliate_id') return item?.value ?? item?.content ?? null;
      }
    }
    if (typeof metadata === 'object') {
      for (const [key, value] of Object.entries(metadata)) {
        if (String(key).toLowerCase() === 'affiliate_id') return value;
      }
      const nested = metadata.data;
      if (nested && nested !== metadata) return readMetadata(nested);
    }
    return null;
  };

  for (const candidate of candidates) {
    const value = readMetadata(candidate);
    if (value != null) return value;
  }

  const matches = findKeyMatches(payload, ['affiliate_id'], '$', 0, []);
  return matches.length ? matches[0].value : null;
}

function getStatus(payload) {
  const order = getOrder(payload);
  return String(
    order?.status?.slug ||
    order?.status?.alias ||
    order?.status?.data?.slug ||
    order?.status?.data?.alias ||
    order?.status?.name ||
    order?.status?.data?.name ||
    order?.status ||
    order?.transactions?.data?.status ||
    payload?.event ||
    ''
  ).toLowerCase().trim().replace(/\s+/g, '_');
}

function getStatusDiagnostics(payload) {
  const order = getOrder(payload);
  const event = payload?.event ?? firstDeepValue(payload, ['event']);
  return {
    event: event ?? null,
    orderId: order?.id ?? order?.number ?? order?.order_id ?? order?.code ?? firstDeepValue(payload, ['order_id','orderId','number','code','id']),
    status: {
      raw: order?.status ?? firstDeepValue(payload, ['status']),
      slug: order?.status?.slug ?? firstDeepValue(payload, ['slug']),
      alias: order?.status?.alias ?? firstDeepValue(payload, ['alias']),
      dataSlug: order?.status?.data?.slug ?? null,
      dataAlias: order?.status?.data?.alias ?? null,
      name: order?.status?.name ?? firstDeepValue(payload, ['status_name']),
      dataName: order?.status?.data?.name ?? null,
      normalized: getStatus(payload) || null,
    },
    metadata: {
      affiliateId: getMetadata(payload),
    },
    keys: {
      payload: Object.keys(payload || {}),
      data: Object.keys(payload?.data || {}),
      order: Object.keys(order || {}),
    },
    matches: findKeyMatches(payload, ['event','status','slug','alias','metadata','affiliate_id','order_id','number','code','total','value_total','amount']),
  };
}

function getTotal(payload) {
  const order = getOrder(payload);
  const candidate = order?.value_total ?? order?.total ?? order?.amount ?? order?.value ?? order?.payment?.total ?? firstDeepValue(payload, ['value_total','total','amount','value']);
  return Number(candidate || 0);
}

function getOrderId(payload) {
  const order = getOrder(payload);
  return order?.id ?? order?.number ?? order?.order_id ?? order?.code ?? firstDeepValue(payload, ['order_id','orderId','number','code']);
}

function safeEqual(a, b) {
  if (!a || !b) return false;
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });

  try {
    const secret = process.env.YAMPI_WEBHOOK_SECRET;
    if (secret) {
      const received = header(req, 'x-yampi-webhook-secret') || header(req, 'x-webhook-secret') || header(req, 'x-yampi-signature');
      if (!safeEqual(received, secret)) return json(res, 401, { error: 'Webhook não autorizado.' });
    }

    const contentType = header(req, 'content-type');
    let rawBody = null;

    // O body parser do Vercel está desativado abaixo para este endpoint.
    // Preferimos sempre ler o stream bruto para descobrir exatamente o que a Yampi enviou.
    if (typeof req.on === 'function') {
      rawBody = await readRawBody(req);
    }

    // Fallback caso o runtime entregue o body já parseado.
    if (rawBody == null || rawBody === '') {
      try {
        rawBody = req.body;
      } catch {
        rawBody = null;
      }
    }

    const payload = parseIncomingBody(rawBody, contentType);
    const diagnostics = getStatusDiagnostics(payload);
    const bodyDiagnostics = {
      contentType: contentType || null,
      contentLength: header(req, 'content-length') || null,
      contentEncoding: header(req, 'content-encoding') || null,
      bodyType: rawBody == null ? null : Buffer.isBuffer(rawBody) ? 'buffer' : typeof rawBody,
      rawLength: Buffer.isBuffer(rawBody) ? rawBody.length : typeof rawBody === 'string' ? Buffer.byteLength(rawBody, 'utf8') : null,
      rawStartsWith: typeof rawBody === 'string' ? rawBody.trim().slice(0, 1) || null : null,
      parsedKeys: Object.keys(payload || {}).slice(0, 80),
      interestingFields: collectInterestingFields(payload),
    };

    // DIAGNÓSTICO TEMPORÁRIO:
    // Não registra PII nem o payload inteiro. O objetivo é descobrir exatamente
    // qual status/alias a Yampi envia e onde o metadata[affiliate_id] aparece.
    console.log('[YAMPI WEBHOOK BODY]', JSON.stringify(bodyDiagnostics));
    console.log('[YAMPI WEBHOOK DIAGNOSTIC]', JSON.stringify(diagnostics));

    const affiliateId = Number(getMetadata(payload));
    const yampiOrderId = String(getOrderId(payload) || '');
    if (!affiliateId || !yampiOrderId) {
      console.log('[YAMPI WEBHOOK DIAGNOSTIC] Ignorado por identificação:', JSON.stringify({
        affiliateId: getMetadata(payload),
        orderId: diagnostics.orderId,
        event: diagnostics.event,
        normalizedStatus: diagnostics.status.normalized,
      }));
      return json(res, 200, { ok: true, ignored: true, reason: 'Sem affiliate_id ou order id.' });
    }

    const affiliates = await supabaseFetch(`/rest/v1/affiliates?id=eq.${affiliateId}&select=id,commission_rate&limit=1`);
    if (!affiliates?.[0]) return json(res, 200, { ok: true, ignored: true, reason: 'Afiliada inexistente.' });

    const event = String(diagnostics.event || '').toLowerCase().trim();
    const detectedStatus = getStatus(payload) || '';
    const normalizedStatus = detectedStatus || (event === 'order.paid' ? 'payment_approved' : '');
    const isPaid = event === 'order.paid' || normalizedStatus === 'payment_approved';

    if (!isPaid) {
      console.log('[YAMPI WEBHOOK DIAGNOSTIC] STATUS NÃO CONFIRMADO:', JSON.stringify({
        event,
        orderId: diagnostics.orderId,
        normalizedStatus,
        statusObject: diagnostics.status,
        affiliateId: diagnostics.metadata.affiliateId,
      }));
      return json(res, 200, {
        ok: true,
        ignored: true,
        reason: 'Evento/status não representa pagamento aprovado.',
        diagnostic: { event, orderId: diagnostics.orderId, normalizedStatus, affiliateId: diagnostics.metadata.affiliateId },
      });
    }

    // order.paid é o evento específico de pagamento aprovado da Yampi.
    // Normalizamos para payment_approved no banco para manter o dashboard e
    // a sincronização com a mesma regra de negócio.
    const status = 'payment_approved';
    const total = getTotal(payload);
    const commission = total * Number(affiliates[0].commission_rate || 0);

    await supabaseFetch(`/rest/v1/affiliate_orders?on_conflict=yampi_order_id`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=minimal',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        yampi_order_id: yampiOrderId,
        affiliate_id: affiliateId,
        status,
        total,
        commission,
        raw_payload: payload,
        updated_at: new Date().toISOString(),
      }),
    });

    return json(res, 200, { ok: true });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Erro no webhook.' });
  }
};

// Importante para webhooks: precisamos do stream bruto da requisição.
// A própria documentação da Vercel recomenda desativar o body parser para isso.
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// Shared webhook entrypoint. Vercel rewrites /api/webhooks/woovi here to
// stay within the project's serverless-function limit. Capture the exact raw
// request bytes so the Woovi handler can validate x-webhook-signature.
const webhookWoovi = require('../_handlers/webhook_woovi');
const webhookYampi = require('../_handlers/webhook_yampi');
const MAX_BODY_BYTES = 4 * 1024 * 1024;

function getPublicPath(req) {
  try {
    const host = req.headers?.host || 'localhost';
    return new URL(req.url || '/', `https://${host}`).pathname.replace(/\/+$/, '') || '/';
  } catch {
    return String(req.url || '').split('?')[0].replace(/\/+$/, '') || '/';
  }
}

async function readAndParseBody(req) {
  // With api.bodyParser disabled, preserve the exact bytes used by the signature.
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Corpo do webhook excede 4 MB.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks);
  req.rawBody = rawBody;
  if (!rawBody.length) {
    req.body = {};
    return;
  }

  const contentType = String(req.headers?.['content-type'] || '').toLowerCase();
  const text = rawBody.toString('utf8');
  if (contentType.includes('application/json') || contentType.includes('+json')) {
    try {
      req.body = JSON.parse(text);
    } catch {
      const error = new Error('JSON inválido no webhook.');
      error.statusCode = 400;
      throw error;
    }
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    req.body = Object.fromEntries(new URLSearchParams(text).entries());
  } else {
    req.body = text;
  }
}

module.exports = async function webhookDispatcher(req, res) {
  let url;
  try { url = new URL(req.url || '/', `https://${req.headers?.host || 'localhost'}`); }
  catch { url = null; }

  const path = getPublicPath(req);
  const provider = String(
    req.query?.provider || url?.searchParams.get('provider') || ''
  ).trim().toLowerCase();

  try {
    if (req.method === 'POST') await readAndParseBody(req);
  } catch (error) {
    return res.status(error.statusCode || 400).json({ error: error.message || 'Corpo de webhook inválido.' });
  }

  if (path === '/api/webhooks/woovi' || provider === 'woovi') {
    return webhookWoovi(req, res);
  }

  return webhookYampi(req, res);
};

// Only this shared webhook function disables Vercel's JSON parser. The body is
// parsed above after preserving the raw bytes. Other API functions are untouched.
module.exports.config = { api: { bodyParser: false } };

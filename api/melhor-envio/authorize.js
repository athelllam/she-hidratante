// Dedicated Vercel Serverless Function for Melhor Envio OAuth authorization.
// Uses the shared OAuth implementation, but does not depend on the catch-all router.
const melhorEnvioOAuth = require('../_handlers/melhor_envio_oauth');
module.exports = async function handler(req, res) {
  const originalUrl = req.url || '/';
  const queryIndex = originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : '';
  const action = String(req.query?.__handler || '');
  req.url = (action === 'status' ? '/api/melhor-envio/status' : '/api/melhor-envio/authorize') + query;
  try { return await melhorEnvioOAuth(req, res); }
  finally { req.url = originalUrl; }
};

// Dedicated Vercel Serverless Function for the Melhor Envio OAuth callback.
// Uses the shared OAuth implementation, but does not depend on the catch-all router.
const melhorEnvioOAuth = require('../_handlers/melhor_envio_oauth');
module.exports = async function handler(req, res) {
  const originalUrl = req.url || '/';
  const queryIndex = originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? originalUrl.slice(queryIndex) : '';
  req.url = '/api/melhor-envio/callback' + query;
  try { return await melhorEnvioOAuth(req, res); }
  finally { req.url = originalUrl; }
};

// Rota explícita para Vercel. Mantém o handler compartilhado com o roteador catch-all.
const handler = require('../_handlers/affiliate_push_subscription');

module.exports = async function pushSubscriptionRoute(req, res) {
  return handler(req, res);
};

const adminAffiliates = require('./_handlers/admin_affiliates');
const adminLogin = require('./_handlers/admin_login');
const adminData = require('./_handlers/admin_data');
const adminWithdrawals = require('./_handlers/admin_withdrawals');
const affiliateAuth = require('./_handlers/affiliate_auth');
const affiliateDashboard = require('./_handlers/affiliate_dashboard');
const affiliateProductPurchases = require('./_handlers/affiliate_product_purchases');
const affiliatePushSubscription = require('./_handlers/affiliate_push_subscription');
const affiliateTrack = require('./_handlers/affiliate_track');
const affiliateWithdraw = require('./_handlers/affiliate_withdraw');
const affiliateYampiSync = require('./_handlers/affiliate_yampi_sync');
const affiliatePublicSlug = require('./_handlers/affiliate_public_slug');
const resellerSettings = require('./_handlers/reseller_settings');
const webhookWoovi = require('./_handlers/webhook_woovi');
const webhookYampi = require('./_handlers/webhook_yampi');
const melhorEnvioOAuth = require('./_handlers/melhor_envio_oauth');
// New cart/admin endpoints are dispatched here to avoid creating additional
// Vercel Serverless Functions. Keep business logic in _handlers.
const adminProducts = require('./_handlers/admin_products');
const cartConfig = require('./_handlers/cart_config');
const businessAnalytics = require('./_handlers/business_analytics');
const siteTrack = require('./_handlers/site_track');

function pathname(req) {
  let current = '/';
  try { current = new URL(req.url, `http://${req.headers?.host || 'localhost'}`).pathname.replace(/\/+$/, '') || '/'; }
  catch { current = String(req.url || '').split('?')[0].replace(/\/+$/, '') || '/'; }

  // Some Vercel catch-all invocations expose the route segments in req.query.path
  // while req.url still contains the catch-all filename. Rebuild the public path.
  const routeSegments = req.query?.path;
  if (routeSegments && (current === '/api/[...path]' || current === '/api/[...path].js' || current === '/')) {
    const parts = Array.isArray(routeSegments) ? routeSegments : String(routeSegments).split('/');
    if (parts.length) return '/api/' + parts.map(part => encodeURIComponent(String(part))).join('/');
  }
  return current;
}

function queryFromUrl(req) {
  try {
    const url = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const out = { ...(req.query || {}) };
    for (const [key, value] of url.searchParams.entries()) out[key] = value;
    return out;
  } catch { return { ...(req.query || {}) }; }
}

module.exports = async function router(req, res) {
  const path = pathname(req);
  req.query = queryFromUrl(req);

  let handler = null;

  if (path === '/api/business-analytics') handler = businessAnalytics;
  else if (path === '/api/site-track') handler = siteTrack;
  else if (path === '/api/admin/products') handler = adminProducts;
  else if (path === '/api/cart-config') handler = cartConfig;
  else if (path === '/api/admin/affiliates') handler = adminAffiliates;
  else if (path === '/api/admin/login') handler = adminLogin;
  else if (path === '/api/admin/data') handler = adminData;
  else if (path === '/api/admin/withdrawals') handler = adminWithdrawals;
  else if (path === '/api/affiliate/auth') handler = affiliateAuth;
  else if (path === '/api/affiliate/login') { req.query.action = 'login'; handler = affiliateAuth; }
  else if (path === '/api/affiliate/register') { req.query.action = 'register'; handler = affiliateAuth; }
  else if (path === '/api/affiliate/logout') { req.query.action = 'logout'; handler = affiliateAuth; }
  else if (path === '/api/affiliate/forgot-password') { req.query.action = 'forgot'; handler = affiliateAuth; }
  else if (path === '/api/affiliate/reset-password') { req.query.action = 'reset'; handler = affiliateAuth; }
  else if (path === '/api/affiliate/dashboard') handler = affiliateDashboard;
  else if (path === '/api/affiliate/product-purchases') handler = affiliateProductPurchases;
  else if (path === '/api/admin/product-purchases') { req.query.admin = '1'; handler = affiliateProductPurchases; }
  else if (path === '/api/affiliate/push-subscription') handler = affiliatePushSubscription;
  else if (path === '/api/affiliate/track') handler = affiliateTrack;
  else if (path === '/api/affiliate/withdraw') handler = affiliateWithdraw;
  else if (path === '/api/affiliate/yampi-sync') handler = affiliateYampiSync;
  else if (path.startsWith('/api/affiliate/public/')) {
    const slug = decodeURIComponent(path.slice('/api/affiliate/public/'.length));
    if (!slug || slug.includes('/')) return res.status(404).json({ error: 'Afiliada não encontrada.' });
    req.query.slug = slug;
    handler = affiliatePublicSlug;
  }
  else if (path === '/api/reseller/settings') handler = resellerSettings;
  else if (path === '/api/webhooks/woovi') handler = webhookWoovi;
  else if (path === '/api/webhooks/yampi') handler = webhookYampi;
  else if (path === '/api/melhor-envio/authorize' || path === '/api/melhor-envio/callback' || path === '/api/melhor-envio/status') handler = melhorEnvioOAuth;

  if (!handler) return res.status(404).json({ error: 'Rota da API não encontrada.' });
  return handler(req, res);
};

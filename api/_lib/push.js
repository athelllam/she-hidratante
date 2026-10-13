const webpush = require('web-push');
const { supabaseFetch } = require('./supabase');

function configure() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error('Variáveis VAPID não configuradas.');
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

async function sendToAffiliate(affiliateId, payload) {
  configure();
  const rows = await supabaseFetch(`/rest/v1/affiliate_push_subscriptions?affiliate_id=eq.${encodeURIComponent(affiliateId)}&active=eq.true&select=id,endpoint,subscription&limit=100`);
  let sent = 0, failed = 0;
  for (const row of rows || []) {
    try { await webpush.sendNotification(row.subscription, JSON.stringify(payload), { TTL: 3600 }); sent++; }
    catch (error) {
      failed++;
      if (error.statusCode === 404 || error.statusCode === 410) {
        await supabaseFetch(`/rest/v1/affiliate_push_subscriptions?id=eq.${Number(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }) }).catch(() => null);
      }
      console.error('Push afiliada falhou:', error.statusCode || 'sem status');
    }
  }
  return { sent, failed, subscriptions: (rows || []).length };
}

async function sendToAll(payload) {
  configure();
  const rows = await supabaseFetch('/rest/v1/affiliate_push_subscriptions?active=eq.true&select=id,affiliate_id,endpoint,subscription&limit=10000');
  let sent = 0, failed = 0;
  for (const row of rows || []) {
    try { await webpush.sendNotification(row.subscription, JSON.stringify(payload), { TTL: 3600 }); sent++; }
    catch (error) {
      failed++;
      if (error.statusCode === 404 || error.statusCode === 410) await supabaseFetch(`/rest/v1/affiliate_push_subscriptions?id=eq.${Number(row.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }) }).catch(() => null);
      console.error('Push broadcast falhou:', error.statusCode || 'sem status');
    }
  }
  return { sent, failed, subscriptions: (rows || []).length };
}
module.exports = { sendToAffiliate, sendToAll };

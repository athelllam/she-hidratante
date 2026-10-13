const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');

module.exports = async function affiliatePushSubscription(req, res) {
  try {
    const { affiliate } = await requireAffiliate(req);
    if (req.method === 'GET') {
      return json(res, 200, { publicKey: process.env.VAPID_PUBLIC_KEY || '', supported: Boolean(process.env.VAPID_PUBLIC_KEY) });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Método não permitido.' });
    const action = req.body?.action;
    if (action === 'unsubscribe') {
      const endpoint = String(req.body?.endpoint || '').trim();
      if (!endpoint) return json(res, 400, { error: 'Inscrição inválida.' });
      await supabaseFetch(`/rest/v1/affiliate_push_subscriptions?affiliate_id=eq.${encodeURIComponent(affiliate.id)}&endpoint=eq.${encodeURIComponent(endpoint)}`, { method: 'DELETE' });
      return json(res, 200, { ok: true });
    }
    const subscription = req.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return json(res, 400, { error: 'Dados da inscrição de notificações inválidos.' });
    }
    const payload = {
      affiliate_id: affiliate.id,
      endpoint: subscription.endpoint,
      subscription,
      user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
      updated_at: new Date().toISOString(),
      active: true,
    };
    await supabaseFetch('/rest/v1/affiliate_push_subscriptions?on_conflict=endpoint', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(payload),
    });

    return json(res, 200, { ok: true, message: 'Inscrição de notificações salva.' });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível configurar as notificações.' });
  }
};

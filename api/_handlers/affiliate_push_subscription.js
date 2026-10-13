const { requireAffiliate, supabaseFetch, json } = require('../_lib/supabase');
const webpush = require('web-push');

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

    // Envia uma notificação de teste logo após salvar a inscrição. Usa a própria
    // inscrição autenticada da afiliada; nenhuma rota pública de envio é criada.
    const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
      return json(res, 200, { ok: true, testNotificationSent: false, message: 'Inscrição salva, mas faltam variáveis VAPID no servidor.' });
    }
    try {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      await webpush.sendNotification(subscription, JSON.stringify({
        title: 'She Afiliadas',
        body: 'Está tudo funcionando! Você receberá por aqui as novidades da sua equipe 💗',
        url: '/afiliado',
        tag: 'she-push-test',
      }), { TTL: 60 });
      return json(res, 200, { ok: true, testNotificationSent: true, message: 'Inscrição salva e notificação de teste enviada.' });
    } catch (pushError) {
      if (pushError.statusCode === 404 || pushError.statusCode === 410) {
        try {
          await supabaseFetch(`/rest/v1/affiliate_push_subscriptions?endpoint=eq.${encodeURIComponent(subscription.endpoint)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false, updated_at: new Date().toISOString() }) });
        } catch {}
      }
      console.error('Falha ao enviar push de teste:', pushError.statusCode || 'sem status', pushError.body || pushError.message || 'erro desconhecido');
      return json(res, 200, { ok: true, testNotificationSent: false, message: 'Inscrição salva, mas o envio de teste falhou.', pushStatus: pushError.statusCode || null });
    }
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'Não foi possível configurar as notificações.' });
  }
};

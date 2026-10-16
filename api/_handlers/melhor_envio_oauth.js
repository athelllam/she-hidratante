const crypto = require('crypto');
const { requireAdmin } = require('../_lib/admin');
const { supabaseFetch, json } = require('../_lib/supabase');

const CALLBACK_PATH = '/api/melhor-envio/callback';
const SCOPES = [
  'shipping-calculate', 'shipping-checkout', 'shipping-generate',
  'shipping-preview', 'shipping-print', 'shipping-tracking', 'shipping-companies',
  'cart-read', 'cart-write', 'users-read'
];
function envName() { return String(process.env.MELHOR_ENVIO_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'; }
function hostBase() { return envName() === 'sandbox' ? 'https://sandbox.melhorenvio.com.br' : 'https://melhorenvio.com.br'; }
function appBase(req) {
  const configured = String(process.env.MELHOR_ENVIO_REDIRECT_URI || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  if (!host || !/^(she-hidratante\.vercel\.app|localhost(?::\d+)?)$/i.test(host)) {
    const error = new Error('Configure MELHOR_ENVIO_REDIRECT_URI com a URL pública exata do callback.'); error.statusCode = 500; throw error;
  }
  return `${proto}://${host}${CALLBACK_PATH}`;
}
function secret() {
  const value = String(process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!value) { const e = new Error('ADMIN_SESSION_SECRET ou SUPABASE_SERVICE_ROLE_KEY não configurado.'); e.statusCode = 500; throw e; }
  return value;
}
function signState(payload) { const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url'); const sig = crypto.createHmac('sha256', secret()).update(encoded).digest('base64url'); return `${encoded}.${sig}`; }
function verifyState(value) {
  if (!value || !value.includes('.')) return false;
  const [payload, signature] = value.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const a = Buffer.from(signature || ''), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a,b)) return false;
  try { const data = JSON.parse(Buffer.from(payload,'base64url').toString('utf8')); return Number(data.exp) > Math.floor(Date.now()/1000) && data.purpose === 'melhor-envio-oauth'; } catch { return false; }
}
async function saveTokens(tokens) {
  const expiresIn = Number(tokens.expires_in || 2592000);
  const now = Date.now();
  const record = {
    id: 1, environment: envName(), token_type: String(tokens.token_type || 'Bearer'),
    access_token: String(tokens.access_token || ''), refresh_token: String(tokens.refresh_token || ''),
    expires_at: new Date(now + expiresIn * 1000).toISOString(), updated_at: new Date(now).toISOString()
  };
  if (!record.access_token || !record.refresh_token) { const e = new Error('Melhor Envio não retornou access_token e refresh_token.'); e.statusCode = 502; throw e; }
  await supabaseFetch('/rest/v1/melhor_envio_credentials?on_conflict=id', { method:'POST', headers:{ Prefer:'resolution=merge-duplicates,return=minimal' }, body:JSON.stringify(record) });
}
async function exchangeToken(params) {
  const clientId = String(process.env.MELHOR_ENVIO_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MELHOR_ENVIO_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) { const e = new Error('Configure MELHOR_ENVIO_CLIENT_ID e MELHOR_ENVIO_CLIENT_SECRET na Vercel.'); e.statusCode = 503; throw e; }
  const response = await fetch(`${hostBase()}/oauth/token`, { method:'POST', headers:{ Accept:'application/json', 'Content-Type':'application/x-www-form-urlencoded', 'User-Agent':'She Afiliadas (suporte@shecoisademulher.com.br)' }, body:new URLSearchParams({ ...params, client_id:clientId, client_secret:clientSecret }) });
  const raw = await response.text(); let data; try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message:raw.slice(0,500) }; }
  if (!response.ok) { const e = new Error(data.message || data.error_description || data.error || `Melhor Envio HTTP ${response.status}`); e.statusCode = 502; throw e; }
  return data;
}
module.exports = async function handler(req,res) {
  try {
    const path = new URL(req.url, 'https://local.invalid').pathname;
    if (path.endsWith('/authorize')) {
      if (req.method !== 'GET') return json(res,405,{error:'Método não permitido.'});
      await requireAdmin(req);
      const clientId = String(process.env.MELHOR_ENVIO_CLIENT_ID || '').trim();
      if (!clientId || !String(process.env.MELHOR_ENVIO_CLIENT_SECRET || '').trim()) return json(res,503,{error:'Configure MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET e MELHOR_ENVIO_REDIRECT_URI na Vercel.'});
      const redirectUri = appBase(req);
      const state = signState({ purpose:'melhor-envio-oauth', exp:Math.floor(Date.now()/1000)+600, nonce:crypto.randomBytes(16).toString('hex') });
      const url = new URL(`${hostBase()}/oauth/authorize`);
      url.searchParams.set('client_id',clientId); url.searchParams.set('redirect_uri',redirectUri); url.searchParams.set('response_type','code'); url.searchParams.set('state',state); url.searchParams.set('scope',SCOPES.join(' '));
      res.statusCode=302; res.setHeader('Location',url.toString()); return res.end();
    }
    if (path.endsWith('/callback')) {
      if (req.method !== 'GET') return json(res,405,{error:'Método não permitido.'});
      const url = new URL(req.url, 'https://local.invalid');
      const code = url.searchParams.get('code'); const state = url.searchParams.get('state');
      if (url.searchParams.get('error')) return res.status(400).send('<!doctype html><meta charset="utf-8"><h2>Autorização do Melhor Envio não concluída</h2><p>Volte ao painel da She e tente novamente.</p>');
      if (!code || !verifyState(state)) return res.status(400).send('<!doctype html><meta charset="utf-8"><h2>Retorno OAuth inválido ou expirado</h2><p>Entre novamente no painel administrativo e inicie a autorização outra vez.</p>');
      const redirectUri = appBase(req);
      const tokens = await exchangeToken({ grant_type:'authorization_code', code, redirect_uri:redirectUri });
      await saveTokens(tokens);
      res.setHeader('Cache-Control','no-store');
      return res.status(200).send('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Melhor Envio conectado</title><body style="font-family:system-ui;max-width:640px;margin:12vh auto;padding:24px"><h1>Melhor Envio autorizado!</h1><p>A autorização foi concluída e os tokens foram armazenados no banco de dados da She, sem exibi-los nesta página.</p><p>Você já pode voltar ao painel administrativo. Mantenha as credenciais da API privadas.</p></body></html>');
    }
    if (path.endsWith('/status')) {
      if (req.method !== 'GET') return json(res,405,{error:'Método não permitido.'});
      await requireAdmin(req);
      const rows = await supabaseFetch('/rest/v1/melhor_envio_credentials?id=eq.1&select=environment,expires_at,updated_at&limit=1');
      const row = rows?.[0];
      return json(res,200,{configured:!!row, environment:row?.environment || envName(), expiresAt:row?.expires_at || null, updatedAt:row?.updated_at || null});
    }
    return json(res,404,{error:'Rota Melhor Envio não encontrada.'});
  } catch(error) {
    const status = Number(error.statusCode) || 500;
    if (req.url && String(req.url).includes('/callback')) return res.status(status).send(`<!doctype html><meta charset="utf-8"><h2>Não foi possível concluir a autorização</h2><p>${String(error.message || 'Erro inesperado').replace(/[<>&]/g,'')}</p><p>Verifique as variáveis da Vercel e tente novamente.</p>`);
    return json(res,status,{error:error.message || 'Erro na integração Melhor Envio.'});
  }
};

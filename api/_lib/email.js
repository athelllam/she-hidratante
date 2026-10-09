const { supabaseFetch } = require('./supabase');

const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const EMAIL_FROM = String(process.env.EMAIL_FROM || '').trim();
const APP_BASE_URL = String(process.env.SITE_URL || process.env.APP_BASE_URL || '').replace(/\/$/, '');

async function adminRecipients() {
  // Prefer the notification list editable from the admin panel. Keep the env var
  // as a fallback until the admin profile settings migration has been applied.
  try {
    const rows = await supabaseFetch('/rest/v1/admin_profile_settings?id=eq.1&select=notification_emails&limit=1');
    if (rows?.[0] && Array.isArray(rows[0].notification_emails)) {
      const saved = [...new Set(rows[0].notification_emails.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))];
      if (saved.length) return saved;
      // Empty saved settings should not silence all administrative alerts.
    }
  } catch {
    // The existing env-based notification configuration remains available if the
    // settings table is absent or temporarily unavailable.
  }
  return [...new Set(String(process.env.ADMIN_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean))];
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buttonHtml(label, href) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#ec4899;color:#fff;text-decoration:none;font-weight:800">${escapeHtml(label)}</a>`;
}

function shell(title, content) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#fff7fb;font-family:Arial,Helvetica,sans-serif;color:#18181b"><div style="max-width:620px;margin:32px auto;padding:0 16px"><div style="background:#fff;border:1px solid #fce7f3;border-radius:24px;padding:32px;box-shadow:0 10px 40px rgba(0,0,0,.05)"><div style="font-size:12px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#ec4899;margin-bottom:10px">SHE COISA DE MULHER</div><h1 style="margin:0 0 18px;font-size:28px;line-height:1.1">${escapeHtml(title)}</h1>${content}</div><p style="font-size:11px;color:#a1a1aa;text-align:center;margin:16px 0">Este e-mail foi enviado automaticamente pelo sistema de afiliadas da She.</p></div></body></html>`;
}

async function sendEmail({ to, subject, html, tags = [] }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) return { skipped: true, reason: 'no_recipients' };
  if (!RESEND_API_KEY || !EMAIL_FROM) return { skipped: true, reason: 'email_not_configured' };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: recipients,
      subject,
      html,
      ...(tags.length ? { tags } : {}),
    }),
  });

  const responseText = await response.text();
  let data = null;
  try { data = responseText ? JSON.parse(responseText) : null; } catch { data = null; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.name || `Resend HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.data = data;
    throw error;
  }
  return data || { ok: true };
}

function resetPasswordEmail({ name, actionLink }) {
  return shell('Redefinição de senha', `
    <p style="font-size:15px;line-height:1.7;color:#52525b">Olá, ${escapeHtml(name || 'afiliada')}! Recebemos uma solicitação para criar uma nova senha para sua conta de afiliada.</p>
    <p style="font-size:15px;line-height:1.7;color:#52525b">Clique no botão abaixo para escolher uma nova senha. O link é temporário e de uso único.</p>
    <div style="margin:26px 0">${buttonHtml('Redefinir minha senha', actionLink)}</div>
    <p style="font-size:12px;line-height:1.6;color:#a1a1aa">Se você não solicitou essa alteração, basta ignorar este e-mail.</p>
  `);
}

function affiliateWelcomeEmail({ name, actionLink }) {
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'linda');
  const cta = actionLink || (APP_BASE_URL ? `${APP_BASE_URL}/afiliado` : '');
  return shell('Sua jornada começa aqui ✨', `
    <div style="margin:0 0 24px;padding:28px 22px;border-radius:20px;background:linear-gradient(135deg,#fce7f3 0%,#fff1f7 52%,#fff7ed 100%);text-align:center;border:1px solid #fbcfe8">
      <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#ffffffd9;color:#be185d;font-size:10px;font-weight:900;letter-spacing:.16em;text-transform:uppercase">SEJA MUITO BEM-VINDA</div>
      <div style="font-size:34px;line-height:1;margin:18px 0 12px;color:#db2777">✦ ✿ ✦</div>
      <h2 style="margin:0;color:#831843;font-size:27px;line-height:1.2">Que bom ter você com a gente, ${safeName}!</h2>
      <p style="margin:12px auto 0;max-width:420px;color:#9d174d;font-size:15px;line-height:1.75">Você acaba de dar o primeiro passo para compartilhar a She e construir seus resultados no seu ritmo.</p>
    </div>
    <p style="font-size:15px;line-height:1.8;color:#52525b">A comunidade <strong style="color:#be185d">She Afiliadas</strong> está feliz em receber você. Seu espaço já está criado — agora é hora de deixar sua marca com autenticidade, carinho e confiança.</p>
    <div style="margin:22px 0;padding:4px 0">
      <div style="display:flex;gap:12px;align-items:flex-start;margin:0 0 16px">
        <div style="flex:0 0 34px;height:34px;line-height:34px;text-align:center;border-radius:12px;background:#fce7f3;color:#be185d;font-weight:900">01</div>
        <div><strong style="font-size:14px;color:#27272a">Prepare seu espaço</strong><p style="margin:4px 0 0;color:#71717a;font-size:13px;line-height:1.6">Acesse o painel e complete os próximos passos, incluindo a criação do seu link exclusivo.</p></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;margin:0 0 16px">
        <div style="flex:0 0 34px;height:34px;line-height:34px;text-align:center;border-radius:12px;background:#fce7f3;color:#be185d;font-weight:900">02</div>
        <div><strong style="font-size:14px;color:#27272a">Compartilhe do seu jeito</strong><p style="margin:4px 0 0;color:#71717a;font-size:13px;line-height:1.6">Mostre os produtos e crie conversas verdadeiras com pessoas que combinam com a marca.</p></div>
      </div>
      <div style="display:flex;gap:12px;align-items:flex-start;margin:0">
        <div style="flex:0 0 34px;height:34px;line-height:34px;text-align:center;border-radius:12px;background:#fce7f3;color:#be185d;font-weight:900">03</div>
        <div><strong style="font-size:14px;color:#27272a">Acompanhe sua evolução</strong><p style="margin:4px 0 0;color:#71717a;font-size:13px;line-height:1.6">Consulte suas vendas, comissões e informações no painel de afiliada.</p></div>
      </div>
    </div>
    ${cta ? `<div style="margin:28px 0;text-align:center">${buttonHtml('Entrar no meu painel ✨', cta)}</div>` : ''}
    <div style="margin-top:22px;padding:15px 17px;border-radius:14px;background:#fafafa;border:1px solid #f4f4f5"><p style="margin:0;color:#71717a;font-size:12px;line-height:1.7">Guarde este e-mail para consultar quando precisar. Estamos torcendo pelo seu sucesso. 💗</p></div>
  `);
}

function affiliateVideoReviewEmail({ name, status, note, submissionId }) {
  const approved = String(status || '').toLowerCase() === 'approved';
  const safeName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'afiliada');
  const title = approved ? 'Seu vídeo foi aprovado! ✨' : 'Atualização sobre seu vídeo';
  const bannerBg = approved ? '#ecfdf5' : '#fff1f2';
  const bannerColor = approved ? '#047857' : '#be123c';
  const badge = approved ? 'APROVADO' : 'PRECISA DE AJUSTES';
  const message = approved
    ? 'Temos uma ótima notícia: nossa equipe analisou seu envio e aprovou o vídeo. Obrigada por dedicar seu tempo e criatividade para divulgar a She!'
    : 'Nossa equipe analisou seu vídeo, mas não conseguiu aprová-lo desta vez. Não desanime: confira a observação abaixo e veja o que pode ser ajustado antes de uma nova submissão, conforme as orientações do programa.';
  const safeNote = String(note || '').trim();
  return shell(title, `
    <div style="margin:0 0 24px;padding:26px 22px;border-radius:20px;background:${approved ? 'linear-gradient(135deg,#fdf2f8 0%,#fce7f3 55%,#ecfdf5 100%)' : 'linear-gradient(135deg,#fff1f2 0%,#fff7fb 58%,#fdf2f8 100%)'};text-align:center;border:1px solid ${approved ? '#fbcfe8' : '#fecdd3'}">
      <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${bannerBg};color:${bannerColor};font-size:10px;font-weight:900;letter-spacing:.15em">${badge}</div>
      <div style="font-size:35px;line-height:1;margin:17px 0 12px;color:${approved ? '#db2777' : '#e11d48'}">${approved ? '✦ ♡ ✦' : '♡'}</div>
      <h2 style="margin:0;color:${approved ? '#831843' : '#9f1239'};font-size:25px;line-height:1.25">${approved ? 'Arrasou, ' : 'Oi, '}${safeName}${approved ? '!' : '!'}</h2>
      <p style="margin:12px auto 0;max-width:430px;color:#52525b;font-size:14px;line-height:1.75">${escapeHtml(message)}</p>
    </div>
    <div style="margin:20px 0;padding:17px 18px;border-radius:16px;background:#fafafa;border:1px solid #f4f4f5">
      <p style="margin:0 0 6px;color:#a1a1aa;font-size:10px;font-weight:900;letter-spacing:.14em;text-transform:uppercase">Solicitação de vídeo</p>
      <p style="margin:0;color:#27272a;font-size:15px;font-weight:800">#${escapeHtml(submissionId || '—')}</p>
      ${safeNote ? `<div style="margin-top:15px;padding-top:13px;border-top:1px solid #e4e4e7"><p style="margin:0 0 5px;color:#52525b;font-size:12px;font-weight:800">Observação da equipe She</p><p style="margin:0;color:#52525b;font-size:13px;line-height:1.75;white-space:pre-wrap">${escapeHtml(safeNote)}</p></div>` : ''}
    </div>
    ${APP_BASE_URL ? `<div style="margin:25px 0;text-align:center">${buttonHtml('Acessar meu painel', `${APP_BASE_URL}/afiliado`)}</div>` : ''}
    <p style="margin:18px 0 0;color:#a1a1aa;font-size:12px;line-height:1.65;text-align:center">${approved ? 'Continue criando com autenticidade — estamos felizes em ver você crescer com a She.' : 'Obrigada por participar e por dedicar seu tempo à She. 💗'}</p>
  `);
}

function adminWithdrawalEmail(withdrawal) {
  const source = withdrawal.source === 'team' ? 'Comissão de equipe' : 'Comissão pessoal';
  return shell('Nova solicitação de saque', `
    <p style="font-size:15px;line-height:1.7;color:#52525b"><strong>${escapeHtml(withdrawal.name || 'Afiliada')}</strong> enviou uma nova solicitação de saque.</p>
    <div style="margin:20px 0;padding:18px;border-radius:16px;background:#fafafa;font-size:14px;line-height:1.8">
      <div><strong>Valor:</strong> R$ ${Number(withdrawal.amount || 0).toFixed(2).replace('.', ',')}</div>
      <div><strong>Origem:</strong> ${escapeHtml(source)}</div>
      <div><strong>PIX:</strong> ${escapeHtml(withdrawal.pixKey || '—')}</div>
      <div><strong>E-mail:</strong> ${escapeHtml(withdrawal.email || '—')}</div>
    </div>
    ${APP_BASE_URL ? `<div style="margin-top:24px">${buttonHtml('Abrir painel administrativo', `${APP_BASE_URL}/admin`)}</div>` : ''}
  `);
}

function adminVideoEmail(video) {
  return shell('Novo vídeo para análise', `
    <p style="font-size:15px;line-height:1.7;color:#52525b"><strong>${escapeHtml(video.name || 'Afiliada')}</strong> enviou um vídeo para análise no painel de afiliadas.</p>
    <div style="margin:20px 0;padding:18px;border-radius:16px;background:#fafafa;font-size:14px;line-height:1.8">
      <div><strong>ID da solicitação:</strong> ${escapeHtml(video.id)}</div>
      <div><strong>Link:</strong> ${escapeHtml(video.url)}</div>
    </div>
    ${APP_BASE_URL ? `<div style="margin-top:24px">${buttonHtml('Abrir painel administrativo', `${APP_BASE_URL}/admin`)}</div>` : ''}
  `);
}

function affiliateBoostJoinEmail({ parentName, childName }) {
  return shell('Nova afiliada entrou na sua equipe', `
    <p style="font-size:15px;line-height:1.7;color:#52525b">Olá, ${escapeHtml(parentName || 'afiliada')}!</p>
    <p style="font-size:15px;line-height:1.7;color:#52525b"><strong>${escapeHtml(childName || 'Uma nova afiliada')}</strong> entrou na sua equipe por meio do <strong>Impulsionar Equipe</strong>.</p>
    <div style="margin:20px 0;padding:18px;border-radius:16px;background:#fff1f7;color:#9d174d;font-weight:800">Essa entrada já foi registrada na sua equipe.</div>
    ${APP_BASE_URL ? `<div style="margin-top:24px">${buttonHtml('Ver minha equipe', `${APP_BASE_URL}/afiliado`)}</div>` : ''}
  `);
}

function affiliateWithdrawalApprovedEmail({ name, amount, status = 'paid' }) {
  const label = status === 'rejected' ? 'foi recusado' : status === 'failed' ? 'falhou' : status === 'approved' ? 'foi aprovado' : 'foi pago';
  const title = status === 'rejected' ? 'Saque recusado' : status === 'failed' ? 'Saque com problema' : status === 'approved' ? 'Saque aprovado' : 'Saque pago';
  const color = status === 'rejected' || status === 'failed' ? '#991b1b' : '#166534';
  const bg = status === 'rejected' || status === 'failed' ? '#fef2f2' : '#f0fdf4';
  return shell(title, `
    <p style="font-size:15px;line-height:1.7;color:#52525b">Olá, ${escapeHtml(name || 'afiliada')}!</p>
    <p style="font-size:15px;line-height:1.7;color:#52525b">Seu saque <strong>${label}</strong> pela She.</p>
    <div style="margin:20px 0;padding:18px;border-radius:16px;background:${bg};color:${color};font-weight:800;font-size:18px">R$ ${Number(amount || 0).toFixed(2).replace('.', ',')}</div>
    <p style="font-size:13px;line-height:1.6;color:#71717a">Consulte o painel da afiliada para acompanhar o histórico do seu saque.</p>
  `);
}

module.exports = {
  sendEmail,
  adminRecipients,
  resetPasswordEmail,
  affiliateWelcomeEmail,
  affiliateVideoReviewEmail,
  adminWithdrawalEmail,
  adminVideoEmail,
  affiliateBoostJoinEmail,
  affiliateWithdrawalApprovedEmail,
  escapeHtml,
};

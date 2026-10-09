const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const EMAIL_FROM = String(process.env.EMAIL_FROM || '').trim();
const APP_BASE_URL = String(process.env.SITE_URL || process.env.APP_BASE_URL || '').replace(/\/$/, '');

function adminRecipients() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
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
  adminWithdrawalEmail,
  adminVideoEmail,
  affiliateBoostJoinEmail,
  affiliateWithdrawalApprovedEmail,
  escapeHtml,
};

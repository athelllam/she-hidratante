const ACCESS_TOKEN = String(process.env.WHATSAPP_ACCESS_TOKEN || '').trim();
const PHONE_NUMBER_ID = String(process.env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
const GRAPH_VERSION = String(process.env.WHATSAPP_GRAPH_VERSION || '').trim();
const ADMIN_NUMBER = String(process.env.WHATSAPP_ADMIN_NUMBER || '').replace(/\D/g, '');
const LANGUAGE_CODE = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'pt_BR').trim();

const TEMPLATES = {
  passwordReset: String(process.env.WHATSAPP_TEMPLATE_PASSWORD_RESET || 'she_password_reset').trim(),
  adminWithdrawal: String(process.env.WHATSAPP_TEMPLATE_ADMIN_WITHDRAWAL || 'she_admin_withdrawal').trim(),
  adminVideo: String(process.env.WHATSAPP_TEMPLATE_ADMIN_VIDEO || 'she_admin_video').trim(),
  teamBoostJoin: String(process.env.WHATSAPP_TEMPLATE_TEAM_BOOST_JOIN || 'she_team_boost_join').trim(),
  withdrawalApproved: String(process.env.WHATSAPP_TEMPLATE_WITHDRAWAL_APPROVED || 'she_withdrawal_approved').trim(),
};

function normalizeNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('55')) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

function assertConfigured() {
  if (!ACCESS_TOKEN || !PHONE_NUMBER_ID || !GRAPH_VERSION) {
    const error = new Error('WhatsApp Cloud API não configurada no ambiente.');
    error.statusCode = 503;
    throw error;
  }
}

async function sendTemplate({ to, templateName, bodyParameters = [], urlParameter = null }) {
  const recipient = normalizeNumber(to);
  if (!recipient) return { skipped: true, reason: 'no_recipient' };
  assertConfigured();

  const components = [];
  if (bodyParameters.length) {
    components.push({
      type: 'body',
      parameters: bodyParameters.map(text => ({ type: 'text', text: String(text ?? '') })),
    });
  }
  if (urlParameter != null) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: String(urlParameter) }],
    });
  }

  const response = await fetch(`https://graph.facebook.com/${encodeURIComponent(GRAPH_VERSION)}/${encodeURIComponent(PHONE_NUMBER_ID)}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: LANGUAGE_CODE },
        ...(components.length ? { components } : {}),
      },
    }),
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const error = new Error(data?.error?.message || data?.message || `WhatsApp HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.data = data;
    throw error;
  }
  return data || { ok: true };
}

async function sendPasswordResetWhatsApp({ whatsapp, name, token }) {
  return sendTemplate({
    to: whatsapp,
    templateName: TEMPLATES.passwordReset,
    bodyParameters: [name || 'afiliada'],
    urlParameter: token,
  });
}

async function sendAdminWithdrawalWhatsApp(withdrawal) {
  const source = withdrawal.source === 'team' ? 'Comissão de equipe' : 'Comissão pessoal';
  return sendTemplate({
    to: ADMIN_NUMBER,
    templateName: TEMPLATES.adminWithdrawal,
    bodyParameters: [
      withdrawal.name || 'Afiliada',
      `R$ ${Number(withdrawal.amount || 0).toFixed(2).replace('.', ',')}`,
      source,
      withdrawal.pixKey || '—',
    ],
  });
}

async function sendAdminVideoWhatsApp(video) {
  return sendTemplate({
    to: ADMIN_NUMBER,
    templateName: TEMPLATES.adminVideo,
    bodyParameters: [video.name || 'Afiliada', String(video.id || '—'), video.url || '—'],
  });
}


async function sendWithdrawalApprovedWhatsApp({ whatsapp, name, amount }) {
  return sendTemplate({
    to: whatsapp,
    templateName: TEMPLATES.withdrawalApproved,
    bodyParameters: [
      name || 'afiliada',
      `R$ ${Number(amount || 0).toFixed(2).replace('.', ',')}`,
    ],
  });
}

async function sendTeamBoostJoinWhatsApp({ parentWhatsapp, parentName, childName }) {
  return sendTemplate({
    to: parentWhatsapp,
    templateName: TEMPLATES.teamBoostJoin,
    bodyParameters: [parentName || 'afiliada', childName || 'Nova afiliada'],
  });
}


module.exports = {
  normalizeNumber,
  sendPasswordResetWhatsApp,
  sendAdminWithdrawalWhatsApp,
  sendAdminVideoWhatsApp,
  sendTeamBoostJoinWhatsApp,
  sendWithdrawalApprovedWhatsApp,
};

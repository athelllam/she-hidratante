const WOOVI_API_URL = String(process.env.WOOVI_API_URL || 'https://api.woovi.com').replace(/\/+$/, '');
const WOOVI_APP_ID = String(process.env.WOOVI_APP_ID || '').trim();

function assertWooviEnv() {
  if (!WOOVI_APP_ID) {
    const err = new Error('WOOVI_APP_ID não configurado nas variáveis de ambiente do backend.');
    err.statusCode = 500;
    throw err;
  }
}

async function wooviFetch(path, options = {}) {
  assertWooviEnv();
  let response;
  try {
    response = await fetch(`${WOOVI_API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: WOOVI_APP_ID,
        accept: 'application/json',
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (cause) {
    const error = new Error('Não foi possível confirmar a resposta da Woovi. O pagamento pode ter sido recebido pela API; não tente novamente até conferir o status na Woovi.');
    error.statusCode = 502;
    error.uncertain = true;
    error.cause = cause;
    throw error;
  }

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.errors?.map?.(item => item.message || item.description || item.code).filter(Boolean).join(' ') ||
      data?.message ||
      data?.error ||
      `Woovi HTTP ${response.status}`;
    const error = new Error(typeof message === 'string' ? message : `Woovi HTTP ${response.status}`);
    error.statusCode = response.status >= 500 ? 502 : 400;
    error.providerStatus = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

function normalizeWooviPixType(value) {
  const type = String(value || '').trim().toUpperCase();
  if (type === 'EVP' || type === 'RANDOM') return 'RANDOM';
  if (['CPF', 'CNPJ', 'EMAIL', 'PHONE'].includes(type)) return type;
  const error = new Error('Tipo de chave Pix não suportado pela Woovi.');
  error.statusCode = 400;
  throw error;
}

async function createPixPayment({ value, pixAddressKey, pixAddressKeyType, correlationID, comment }) {
  const amountCents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
    const error = new Error('Valor inválido para pagamento Pix.');
    error.statusCode = 400;
    throw error;
  }
  return wooviFetch('/api/v1/payment', {
    method: 'POST',
    body: JSON.stringify({
      type: 'PIX_KEY',
      value: amountCents,
      destinationAlias: String(pixAddressKey || '').trim(),
      destinationAliasType: normalizeWooviPixType(pixAddressKeyType),
      correlationID: String(correlationID),
      comment: String(comment || '').slice(0, 140),
      autoApprove: true,
    }),
  });
}

module.exports = { wooviFetch, createPixPayment, normalizeWooviPixType };

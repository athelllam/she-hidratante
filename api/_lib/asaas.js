const ASAAS_API_URL = String(process.env.ASAAS_API_URL || 'https://api.asaas.com/v3').replace(/\/+$/, '');
const ASAAS_API_KEY = String(process.env.ASAAS_API_KEY || '').trim();

function assertAsaasEnv() {
  if (!ASAAS_API_KEY) {
    const err = new Error('ASAAS_API_KEY não configurada.');
    err.statusCode = 500;
    throw err;
  }
}

async function asaasFetch(path, options = {}) {
  assertAsaasEnv();
  const response = await fetch(`${ASAAS_API_URL}${path}`, {
    ...options,
    headers: {
      access_token: ASAAS_API_KEY,
      accept: 'application/json',
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    const message =
      data?.errors?.map?.(item => item.description || item.code).filter(Boolean).join(' ') ||
      data?.message ||
      data?.error ||
      `Asaas HTTP ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status >= 500 ? 502 : 400;
    error.data = data;
    throw error;
  }

  return data;
}

async function createPixTransfer({ value, pixAddressKey, pixAddressKeyType, externalReference, description }) {
  return asaasFetch('/transfers', {
    method: 'POST',
    body: JSON.stringify({
      value: Number(value),
      pixAddressKey,
      pixAddressKeyType,
      operationType: 'PIX',
      description,
      externalReference,
    }),
  });
}

module.exports = { asaasFetch, createPixTransfer };

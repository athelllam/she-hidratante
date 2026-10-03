const STORAGE_KEY = 'sheYampiCartPrices:v1'
const CART_TOKENS = ['EFH0YOIDTO', '7B6B7IL4ZM', '6G99ZYJTDE', 'IWK5ZWCEUO', 'ORM1LRMTT5', 'GVVB8UXHJ8']

let memoryCache = null
let requestPromise = null

function readCache() {
  if (memoryCache) return memoryCache
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null')
    if (parsed?.prices && typeof parsed.prices === 'object') {
      memoryCache = parsed.prices
      return memoryCache
    }
  } catch {}
  return null
}

function writeCache(prices) {
  memoryCache = prices
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ prices, savedAt: Date.now() })) } catch {}
}

export function getCartProductPrice(prices, token) {
  return prices?.[String(token).toUpperCase()] || null
}

export function getCartTokens() {
  return [...CART_TOKENS]
}

export async function syncCartPrices({ force = false } = {}) {
  if (!force) {
    const cached = readCache()
    if (cached && CART_TOKENS.every((token) => cached[token])) {
      requestPromise = requestPromise || Promise.resolve(cached)
      return requestPromise
    }
  }

  if (requestPromise) return requestPromise

  requestPromise = fetch(`/api/affiliate/yampi-sync?prices=1&tokens=${encodeURIComponent(CART_TOKENS.join(','))}`, {
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        const error = new Error(data?.error || `Falha ao atualizar preços (${response.status}).`)
        error.data = data
        throw error
      }
      writeCache(data.prices)
      return data.prices
    })
    .finally(() => {
      requestPromise = null
    })

  return requestPromise
}

export function getCachedCartPrices() {
  return readCache()
}

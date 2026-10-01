const STORAGE_KEY = 'sheAffiliateSlug'
const VISITOR_KEY = 'sheAffiliateVisitorId'

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id = `${crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}

async function postTracking(payload) {
  try {
    const response = await fetch('/api/affiliate/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data?.error || `Tracking HTTP ${response.status}`)
    }
    return data
  } catch (error) {
    console.error('[She Afiliadas] Falha ao registrar acesso:', error)
    return { ok: false, error: error?.message || 'Falha no tracking.' }
  }
}

export function withAffiliateMetadata(url, affiliateId) {
  if (!url || !affiliateId) return url

  try {
    const target = new URL(url)
    target.searchParams.set('metadata[affiliate_id]', String(affiliateId))
    return target.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}metadata%5Baffiliate_id%5D=${encodeURIComponent(String(affiliateId))}`
  }
}

export function buildYampiCheckoutUrl({ tokens, affiliateId }) {
  const base = `https://seguro.shecoisademulher.com/r/${tokens.join(',')}`
  return withAffiliateMetadata(base, affiliateId)
}

export function rememberAffiliate(slug) {
  if (!slug) return
  try { localStorage.setItem(STORAGE_KEY, String(slug).toLowerCase()) } catch {}
}

export function getRememberedAffiliate() {
  try { return localStorage.getItem(STORAGE_KEY) || null } catch { return null }
}

export function trackAffiliateAccess(affiliateOrId, target = 'checkout', affiliateSlug = '') {
  const affiliate = typeof affiliateOrId === 'object' ? affiliateOrId : { id: affiliateOrId, slug: affiliateSlug }
  if (!affiliate?.id) return Promise.resolve({ ok: false, skipped: true, error: 'Affiliate ID ausente.' })
  const slug = String(affiliate.slug || affiliateSlug || '').toLowerCase()
  const path = window.location.pathname
  const visitorId = getVisitorId()
  const day = new Date().toISOString().slice(0, 10)
  return postTracking({
    affiliateId: affiliate.id,
    affiliateSlug: slug,
    type: 'access',
    target,
    visitorId,
    path,
    referrer: document.referrer || '',
    day,
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })
}

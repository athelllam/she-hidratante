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
    await fetch('/api/affiliate/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify(payload),
    })
  } catch {
    // Tracking nunca deve bloquear a navegação ou o checkout.
  }
}

export function withAffiliateMetadata(url, affiliateId) {
  if (!url || !affiliateId) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}metadata[affiliate_id]=${encodeURIComponent(String(affiliateId))}`
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

export function trackAffiliateAccess(affiliate, target = 'checkout') {
  if (!affiliate?.id) return
  const slug = String(affiliate.slug || '').toLowerCase()
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

export function trackAffiliateClick(affiliate, target = 'checkout') {
  if (!affiliate?.id) return
  postTracking({
    affiliateId: affiliate.id,
    affiliateSlug: String(affiliate.slug || '').toLowerCase(),
    type: 'click',
    target,
    visitorId: getVisitorId(),
    path: window.location.pathname,
    referrer: document.referrer || '',
    eventId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  })
}

const STORAGE_KEY = 'sheAffiliateSlug'
const VISITOR_KEY = 'sheAffiliateVisitorId'

// Identificadores de atribuição Meta. Mantemos os valores disponíveis durante
// a navegação no site e os encaminhamos ao checkout como metadados.
function readCookie(name) {
  try {
    const prefix = `${name}=`
    const item = document.cookie.split('; ').find(value => value.startsWith(prefix))
    return item ? decodeURIComponent(item.slice(prefix.length)) : ''
  } catch { return '' }
}

export function getMetaAttribution() {
  try {
    const params = new URLSearchParams(window.location.search)
    const fbclid = params.get('fbclid') || sessionStorage.getItem('sheMetaFbclid') || ''
    if (params.get('fbclid')) sessionStorage.setItem('sheMetaFbclid', params.get('fbclid'))

    let fbc = readCookie('_fbc')
    if (!fbc && fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`
      try { document.cookie = `_fbc=${encodeURIComponent(fbc)}; path=/; max-age=7776000; SameSite=Lax` } catch {}
    }
    const fbp = readCookie('_fbp')
    return { fbclid, fbc, fbp }
  } catch { return { fbclid: '', fbc: '', fbp: '' } }
}

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
  const checkoutUrl = withAffiliateMetadata(base, affiliateId)

  try {
    const target = new URL(checkoutUrl)
    const { fbclid, fbc, fbp } = getMetaAttribution()
    // A Yampi integração pode consumir esses metadados no pedido/CAPI.
    if (fbclid) target.searchParams.set('metadata[fbclid]', fbclid)
    if (fbc) target.searchParams.set('metadata[fbc]', fbc)
    if (fbp) target.searchParams.set('metadata[fbp]', fbp)
    return target.toString()
  } catch {
    return checkoutUrl
  }
}

export function rememberAffiliate(slug) {
  if (!slug) return
  try { localStorage.setItem(STORAGE_KEY, String(slug).toLowerCase()) } catch {}
}

export function getRememberedAffiliate() {
  try { return localStorage.getItem(STORAGE_KEY) || null } catch { return null }
}

export function trackAffiliateAccess(affiliateOrId, target = 'access', affiliateSlug = '') {
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

export function clearRememberedAffiliate() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

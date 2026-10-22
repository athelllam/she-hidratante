import { lazy, Suspense, useEffect, useState } from 'react'
import { trackAffiliateAccess, rememberAffiliate } from './utils/affiliateTracking'
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom'
import Welcome from './pages/Welcome'
import AffiliateDashboard from './pages/AffiliateDashboard'
import AdminDashboard from './pages/AdminDashboard'
import AdminProducts from './pages/AdminProducts'
import AdminTrafficDashboard from './pages/AdminTrafficDashboard'
import AdminBusinessDashboard from './pages/AdminBusinessDashboard'
import TrabalheConosco from './pages/TrabalheConosco'
import Representantes from './pages/Representantes'
import Revendedora from './pages/Revendedora'
import TermosAfiliadas from './pages/TermosAfiliadas'
import AffiliatePasswordReset from './pages/AffiliatePasswordReset'
import AffiliateProgram from './pages/AffiliateProgram'
import PoliticaPrivacidade from './pages/PoliticaPrivacidade'
import TermosDeUso from './pages/TermosDeUso'

const Home = lazy(() => import('./pages/Home'))
const Hidratante = lazy(() => import('./pages/Hidratante'))
const Stick = lazy(() => import('./pages/Stick'))
const Gummies = lazy(() => import('./pages/Gummies'))
const Ovinhos = lazy(() => import('./pages/Ovinhos'))



const SITE_VISITOR_KEY = 'sheSiteVisitorId'
const SITE_SESSION_KEY = 'sheSiteSessionId'
function siteId(key) {
  try {
    let value = localStorage.getItem(key)
    if (!value) { value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(key, value) }
    return value
  } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}` }
}
function SiteAnalyticsTracker() {
  const location = useLocation()
  useEffect(() => {
    const path = `${location.pathname || '/'}${location.search || ''}`.slice(0, 300)
    // Não conta rotas administrativas nem a entrada de afiliada, já contabilizada no tracking próprio.
    if (path.startsWith('/admin')) return
    const routeName = (location.pathname || '/').replace(/^\/|\/$/g, '')
    const knownSingleRoutes = new Set(['', 'home', 'hidratante', 'stick', 'gummies', 'ovinhos', 'programa-afiliadas', 'afiliado', 'revendedora', 'representantes', 'trabalhe-conosco', 'termos-afiliadas', 'politica-privacidade', 'termos-de-uso'])
    if (routeName && !routeName.includes('/') && !knownSingleRoutes.has(routeName)) return
    try { const remembered = localStorage.getItem('sheAffiliateSlug'); if (remembered && routeName === remembered) return } catch {}
    let sessionId
    try {
      sessionId = sessionStorage.getItem(SITE_SESSION_KEY)
      if (!sessionId) { sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; sessionStorage.setItem(SITE_SESSION_KEY, sessionId) }
    } catch { sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}` }
    const visitorId = siteId(SITE_VISITOR_KEY)
    const eventId = `${sessionId}:${path}`
    fetch('/api/site-track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ visitorId, sessionId, path, referrer: document.referrer || '', eventId }) }).catch(() => {})
  }, [location.pathname, location.search])
  return null
}

function ScrollToTop() {
  const location = useLocation()

  useEffect(() => {
    const path = String(location.pathname || '').replace(/\/+$/, '') || '/'
    // Preservar a posição de scroll nas páginas do Hidratante e do Stick.
    const isProductPage = path === '/hidratante'
      || path === '/stick'
      || /^\/[^/]+\/(hidratante|stick)$/.test(path)

    if (isProductPage) return

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [location.pathname])

  return null
}

function PageFallback() {
  return <div className="min-h-screen bg-[#fffafc]" />
}

function AffiliateGuard({ children }) {
  const { affiliateSlug } = useParams()
  const [state, setState] = useState({ loading: true, affiliate: null })

  useEffect(() => {
    let active = true
    fetch(`/api/affiliate/public/${encodeURIComponent(affiliateSlug || '')}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => active && setState({ loading: false, affiliate: data.affiliate }))
      .catch(() => active && setState({ loading: false, affiliate: null }))
    return () => { active = false }
  }, [affiliateSlug])

  if (state.loading) return <PageFallback />
  if (!state.affiliate?.active) return <Navigate to="/" replace />
  return children(state.affiliate)
}

function AffiliateRoot() {
  return <AffiliateGuard>{affiliate => <AffiliateRootTracker affiliate={affiliate} />}</AffiliateGuard>
}

function AffiliateRootTracker({ affiliate }) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    rememberAffiliate(affiliate.slug)
    trackAffiliateAccess(affiliate, 'access')
      .finally(() => { if (active) setDone(true) })
    return () => { active = false }
  }, [affiliate])

  if (!done) return <PageFallback />
  return <Navigate to={`/${affiliate.slug}/welcome`} replace />
}

function AffiliateWelcome() {
  return <AffiliateGuard>{affiliate => <Welcome affiliateSlug={affiliate.slug} affiliate={affiliate} />}</AffiliateGuard>
}

function AffiliateProduct({ Product }) {
  return <AffiliateGuard>{affiliate => <Product affiliateId={affiliate.id} affiliate={affiliate} />}</AffiliateGuard>
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <SiteAnalyticsTracker />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/home" element={<Home />} />
          <Route path="/hidratante" element={<Hidratante />} />
          <Route path="/stick" element={<Stick />} />
          <Route path="/gummies" element={<Gummies />} />
          <Route path="/ovinhos" element={<Ovinhos />} />
          <Route path="/programa-afiliadas" element={<AffiliateProgram />} />
          <Route path="/afiliado/redefinir-senha" element={<AffiliatePasswordReset />} />
          <Route path="/afiliado/redefinir-senha/:token" element={<AffiliatePasswordReset />} />
          <Route path="/afiliado" element={<AffiliateDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/produtos" element={<AdminProducts />} />
          <Route path="/admin/trafego-pago" element={<AdminTrafficDashboard />} />
          <Route path="/admin/negocio" element={<AdminBusinessDashboard />} />
          <Route path="/trabalhe-conosco" element={<TrabalheConosco />} />
          <Route path="/representantes" element={<Representantes />} />
          <Route path="/revendedora" element={<Revendedora />} />
          <Route path="/termos-afiliadas" element={<TermosAfiliadas />} />
          <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
          <Route path="/termos-de-uso" element={<TermosDeUso />} />
          <Route path="/afiliadas/*" element={<AffiliateDashboard />} />
          <Route path="/:affiliateSlug/welcome" element={<AffiliateWelcome />} />
          <Route path="/:affiliateSlug/hidratante" element={<AffiliateProduct Product={Hidratante} />} />
          <Route path="/:affiliateSlug/stick" element={<AffiliateProduct Product={Stick} />} />
          <Route path="/:affiliateSlug" element={<AffiliateRoot />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

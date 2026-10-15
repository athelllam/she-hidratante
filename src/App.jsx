import { lazy, Suspense, useEffect, useState } from 'react'
import { trackAffiliateAccess } from './utils/affiliateTracking'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import Welcome from './pages/Welcome'
import AffiliateDashboard from './pages/AffiliateDashboard'
import AdminDashboard from './pages/AdminDashboard'
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

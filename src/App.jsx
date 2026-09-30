import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Welcome from './pages/Welcome'

const Home = lazy(() => import('./pages/Home'))
const Hidratante = lazy(() => import('./pages/Hidratante'))
const Stick = lazy(() => import('./pages/Stick'))
const Gummies = lazy(() => import('./pages/Gummies'))
const Ovinhos = lazy(() => import('./pages/Ovinhos'))

function PageFallback() {
  return <div className="min-h-screen bg-[#fffafc]" />
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
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

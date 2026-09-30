import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import Hidratante from './pages/Hidratante'
import Stick from './pages/Stick'
import Gummies from './pages/Gummies'
import Ovinhos from './pages/Ovinhos'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/home" element={<Home />} />
        <Route path="/hidratante" element={<Hidratante />} />
        <Route path="/stick" element={<Stick />} />
        <Route path="/gummies" element={<Gummies />} />
        <Route path="/ovinhos" element={<Ovinhos />} />
      </Routes>
    </BrowserRouter>
  )
}

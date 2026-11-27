import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rememberAffiliate } from '../utils/affiliateTracking'
import logo from '../assets/she-logo.webp'
import hidratanteImage from '../assets/cart/hidratante.webp'
import stickImage from '../assets/cart/stick-clareador.webp'
import blackFridayImage from '../assets/black-friday-gold.png'

const options = [
  {
    label: 'Tenho ressecamento, dor, candidíase.',
    path: '/hidratante',
    image: hidratanteImage,
  },
  {
    label: 'Desejo clarear a pele, manchas, cicatrizes, melasma.',
    path: '/stick',
    image: stickImage,
  },
]

export default function Welcome({ affiliateSlug = null, affiliate = null }) {
  const navigate = useNavigate()
  useEffect(() => { if (affiliateSlug) rememberAffiliate(affiliateSlug) }, [affiliateSlug])
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const savedName = localStorage.getItem('sheVisitorName')
    if (savedName) setName(savedName)

    const timer = window.setTimeout(() => setIsLoading(false), 900)
    return () => window.clearTimeout(timer)
  }, [])

  const handleChoice = (path) => {
    const cleanName = name.trim()
    if (cleanName) localStorage.setItem('sheVisitorName', cleanName)
    const affiliatePath = affiliateSlug ? `/${affiliateSlug}${path}` : path
    navigate(affiliatePath)
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#fffafc] flex flex-col items-center justify-center px-5">
        <div className="flex flex-col items-center w-full max-w-[220px]">
          <img
            src={logo}
            alt="She"
            className="w-36 md:w-44 opacity-0 animate-[sheLogoIn_0.7s_ease-out_forwards]"
            loading="eager"
          />
          <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-pink-100">
            <div className="h-full w-0 rounded-full bg-pink-500 animate-[sheLoader_0.8s_ease-out_0.15s_forwards]" />
          </div>
        </div>
        <style>{`
          @keyframes sheLogoIn {
            from { opacity: 0; transform: translateY(10px) scale(0.97); }
            to { opacity: 0.9; transform: translateY(0) scale(1); }
          }
          @keyframes sheLoader {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </main>
    )
  }

  return (
    <>
      <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
        <button type="button" aria-expanded={menuOpen} aria-label="Abrir menu" onClick={() => setMenuOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-pink-100 bg-white/95 px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-lg backdrop-blur hover:border-pink-300">
          <span className="text-pink-500">☰</span> Menu <span className="text-xs text-pink-500">{menuOpen ? '⌃' : '⌄'}</span>
        </button>
        {menuOpen && <div className="absolute right-0 mt-2 w-[min(19rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-pink-100 bg-white p-2 shadow-2xl">
          <button onClick={() => { setMenuOpen(false); handleChoice('/hidratante') }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-zinc-800 transition hover:bg-pink-50">
            <img src={hidratanteImage} alt="Hidratante Íntimo" className="h-12 w-10 shrink-0 rounded-lg border border-pink-100 bg-white object-contain" />
            <span>Hidratante Íntimo</span>
          </button>
          <button onClick={() => { setMenuOpen(false); handleChoice('/stick') }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-semibold text-zinc-800 transition hover:bg-pink-50">
            <img src={stickImage} alt="Stick Clareador de Pele" className="h-12 w-10 shrink-0 rounded-lg border border-pink-100 bg-white object-contain" />
            <span>Stick Clareador de Pele</span>
          </button>
          <div className="my-2 border-t border-pink-200" />
          <a href="/programa-afiliadas" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold text-pink-600 transition hover:bg-pink-50">Afiliadas</a>
          <a href="/revendedora" onClick={() => setMenuOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-bold text-pink-600 transition hover:bg-pink-50">Revendedoras</a>
          <button onClick={() => { setMenuOpen(false); navigate('/minhas-compras') }} className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-zinc-600 transition hover:bg-pink-50">Minhas Compras</button>
        </div>}
      </div>
      <main className="she-welcome-page min-h-screen bg-[#fffafc] flex items-center justify-center px-4 py-4 sm:px-5 sm:py-6">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,207,232,0.42)_0%,rgba(251,207,232,0)_70%)]" />
          <div className="absolute bottom-[-180px] left-[-100px] w-[420px] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,228,230,0.42)_0%,rgba(255,228,230,0)_70%)]" />
        </div>

        <section className="she-welcome-card relative z-10 w-full max-w-xl rounded-[1.75rem] md:rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-white shadow-[0_30px_100px_rgba(0,0,0,0.10)] px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-12">
          <div className="flex flex-col items-center mb-5 sm:mb-6">
            <img src={blackFridayImage} alt="Black Friday" className="mb-2 w-56 max-w-[82%] sm:w-64 md:w-72 drop-shadow-sm" loading="eager" />
            <img src={logo} alt="She" className="w-32 sm:w-36 md:w-52 opacity-90" loading="eager" />
          </div>

          <div className="mt-5 sm:mt-6">
            <label htmlFor="she-name" className="block text-xs font-semibold text-zinc-500 mb-2 ml-1">
              Qual seu nome?
            </label>

            <input
              id="she-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  document.getElementById('she-options')?.focus()
                }
              }}
              placeholder="Digite seu nome"
              autoComplete="given-name"
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
            />
          </div>

          <div id="she-options" className="mt-5 space-y-5">
            {options.map((option, index) => (
              <div key={option.label}>
                <p className="mb-2 px-1 text-center text-xs sm:text-sm font-black uppercase tracking-[.13em] text-pink-500">
                  {index === 0 ? 'Hidratante Íntimo' : 'Stick Clareador de Pele'}
                </p>
                <button
                  type="button"
                  onClick={() => handleChoice(option.path)}
                  className={`w-full text-left rounded-2xl p-2.5 sm:p-3 border transition-all duration-300 active:scale-[0.985] ${
                    index === 0
                      ? 'border-pink-200 bg-pink-50/70 hover:bg-pink-50 hover:border-pink-300'
                      : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <span className="flex items-center gap-3 sm:gap-4">
                    <img src={option.image} alt={index === 0 ? 'Hidratante Íntimo SHE' : 'Stick Clareador SHE'} className="h-[4.25rem] w-[3.35rem] sm:h-[4.75rem] sm:w-[3.75rem] shrink-0 rounded-xl border border-white/90 bg-white object-contain shadow-sm" loading="eager" />
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                      <span className="text-[15px] sm:text-base md:text-[17px] font-semibold leading-snug text-zinc-900">
                        {option.label}
                      </span>
                      <span className="text-zinc-400 text-xl shrink-0">→</span>
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>

          <p className="mt-5 text-center text-[10px] md:text-xs text-zinc-400">
            Sua experiência será personalizada de acordo com sua escolha.
          </p>


        </section>
      </main>
      <style>{`
        /* A welcome deve ocupar a viewport sem criar scroll no documento.
           Os espaçamentos diminuem conforme a altura disponível, para evitar cortes em celulares. */
        .she-welcome-page {
          height: 100vh;
          height: 100dvh;
          min-height: 0;
          overflow: hidden;
          box-sizing: border-box;
          padding-top: max(12px, env(safe-area-inset-top));
          padding-bottom: max(12px, env(safe-area-inset-bottom));
        }
        .she-welcome-card {
          max-height: calc(100dvh - 24px);
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
          padding-top: clamp(12px, 3.2dvh, 48px);
          padding-bottom: clamp(12px, 3.2dvh, 48px);
        }
        .she-welcome-card::-webkit-scrollbar { display: none; }
        .she-welcome-card > div:first-child { margin-bottom: clamp(8px, 1.8dvh, 24px); }
        .she-welcome-card > div:first-child img:last-child { width: clamp(130px, 22dvh, 280px); }
        .she-welcome-card > div:first-child img:first-child { width: clamp(280px, 48dvh, 520px); max-width: 100%; max-height: 150px; object-fit: contain; }
        .she-welcome-card p { line-height: 1.35; }
        .she-welcome-card input { padding-top: clamp(8px, 1.5dvh, 12px); padding-bottom: clamp(8px, 1.5dvh, 12px); }
        .she-welcome-card #she-options { margin-top: clamp(10px, 2dvh, 24px); gap: clamp(8px, 1.8dvh, 20px); }
        .she-welcome-card #she-options button { padding-top: clamp(10px, 1.8dvh, 18px); padding-bottom: clamp(10px, 1.8dvh, 18px); }
        .she-welcome-card #she-options img { height: clamp(58px, 8.5dvh, 76px); width: clamp(46px, 6.5dvh, 60px); }
        @media (max-height: 650px) {
          .she-welcome-card { border-radius: 22px; }
          .she-welcome-card > div:first-child { margin-bottom: 8px; }
          .she-welcome-card .mt-5 { margin-top: 10px; }
          .she-welcome-card .mt-3 { margin-top: 8px; }
          .she-welcome-card #she-options > div > p { margin-bottom: 5px; }
          
          .she-welcome-card > p:last-of-type { margin-top: 10px; }
          .she-welcome-card > div:last-child { margin-top: 10px; }
        }
      `}</style>
    </>
  )
}

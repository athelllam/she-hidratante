import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/she-logo.webp'

const options = [
  {
    label: 'Tenho ressecamento, dor, candidíase.',
    path: '/hidratante',
  },
  {
    label: 'Desejo clarear a pele, manchas, cicatrizes, melasma.',
    path: '/stick',
  },
  {
    label: 'Quero conhecer os produtos da She.',
    path: '/home',
    isHome: true,
  },
]

export default function Welcome() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [showIntro, setShowIntro] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setShowIntro(false), 1700)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const savedName = localStorage.getItem('sheVisitorName')
    if (savedName) setName(savedName)

  }, [])

  const handleChoice = (path) => {
    const cleanName = name.trim()
    if (cleanName) localStorage.setItem('sheVisitorName', cleanName)
    navigate(path)
  }

  return (
    <>
      <style>{`
        @keyframes sheIntroBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes sheIntroLogo {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {showIntro && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center">
            <img
              src={logo}
              alt=""
              className="w-40 md:w-52 object-contain"
              style={{ animation: 'sheIntroLogo 350ms ease-out both' }}
            />
            <div className="mt-7 h-[3px] w-32 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-[#EC4899]"
                style={{ animation: 'sheIntroBar 1400ms cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
              />
            </div>
          </div>
        </div>
      )}

      <main className="min-h-screen bg-[#fffafc] flex items-center justify-center px-5 py-10">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-pink-200/30 blur-[120px]" />
          <div className="absolute bottom-[-180px] left-[-100px] w-[420px] h-[420px] rounded-full bg-rose-100/30 blur-[110px]" />
        </div>

        <section className="she-welcome-card relative z-10 w-full max-w-xl rounded-[2rem] md:rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-white shadow-[0_30px_100px_rgba(0,0,0,0.10)] px-6 py-9 md:px-10 md:py-12">
          <div className="flex justify-center mb-8">
            <img src={logo} alt="She" className="w-40 md:w-52 opacity-90" loading="eager" />
          </div>

          <div className="text-center">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-zinc-950 leading-[1.05]">
              O que a trouxe
              <br />
              até aqui?
            </h1>

            <p className="mt-5 text-sm md:text-base text-zinc-500">
              Antes de continuar, queremos conhecer você.
            </p>
          </div>

          <div className="mt-8">
            <label htmlFor="she-name" className="block text-xs font-semibold text-zinc-500 mb-2 ml-1">
              Qual seu apelido?
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
              className="w-full rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-base text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
            />
          </div>

          <div id="she-options" className="mt-5 space-y-3">
            {options.map((option, index) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleChoice(option.path)}
                className={`w-full text-left rounded-2xl px-5 py-4 md:py-4.5 border transition-all duration-300 active:scale-[0.985] ${
                  index === 0
                    ? 'border-pink-200 bg-pink-50/70 hover:bg-pink-50 hover:border-pink-300'
                    : 'border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300'
                }`}
              >
                <span className="flex items-center justify-between gap-4">
                  <span className="text-sm md:text-[15px] font-semibold leading-snug text-zinc-900">
                    {option.label}
                  </span>
                  <span className="text-zinc-400 text-lg shrink-0">→</span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-7 text-center text-[10px] md:text-xs text-zinc-400">
            Sua experiência será personalizada de acordo com sua escolha.
          </p>
        </section>
      </main>
    </>
  )
}

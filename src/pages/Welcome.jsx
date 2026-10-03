import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { rememberAffiliate } from '../utils/affiliateTracking'
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

export default function Welcome({ affiliateSlug = null, affiliate = null }) {
  const navigate = useNavigate()
  useEffect(() => { if (affiliateSlug) rememberAffiliate(affiliateSlug) }, [affiliateSlug])
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const savedName = localStorage.getItem('sheVisitorName')
    if (savedName) setName(savedName)

    const timer = window.setTimeout(() => setIsLoading(false), 900)
    return () => window.clearTimeout(timer)
  }, [])

  const handleChoice = (path) => {
    const cleanName = name.trim()
    if (cleanName) localStorage.setItem('sheVisitorName', cleanName)
    const affiliatePath = affiliateSlug && path !== '/home' ? `/${affiliateSlug}${path}` : path
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
      <main className="min-h-screen bg-[#fffafc] flex items-center justify-center px-4 py-4 sm:px-5 sm:py-6">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[620px] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,207,232,0.42)_0%,rgba(251,207,232,0)_70%)]" />
          <div className="absolute bottom-[-180px] left-[-100px] w-[420px] h-[420px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,228,230,0.42)_0%,rgba(255,228,230,0)_70%)]" />
        </div>

        <section className="she-welcome-card relative z-10 w-full max-w-xl rounded-[1.75rem] md:rounded-[2.5rem] bg-white/80 backdrop-blur-xl border border-white shadow-[0_30px_100px_rgba(0,0,0,0.10)] px-5 py-6 sm:px-6 sm:py-8 md:px-10 md:py-12">
          <div className="flex justify-center mb-5 sm:mb-6">
            <img src={logo} alt="She" className="w-32 sm:w-36 md:w-52 opacity-90" loading="eager" />
          </div>

          <div className="text-center">
            <h1 className="text-[2rem] sm:text-3xl md:text-5xl font-black tracking-tight text-zinc-950 leading-[1.05]">
              O que a trouxe
              <br />
              até aqui?
            </h1>

            <p className="mt-3 sm:mt-4 text-sm md:text-base text-zinc-500">
              Antes de continuar, queremos conhecer você.
            </p>
          </div>

          <div className="mt-5 sm:mt-6">
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
              className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-zinc-900 outline-none transition-all placeholder:text-zinc-400 focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
            />
          </div>

          <div id="she-options" className="mt-4 space-y-2.5">
            {options.map((option, index) => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleChoice(option.path)}
                className={`w-full text-left rounded-2xl px-4 py-3.5 md:py-4 border transition-all duration-300 active:scale-[0.985] ${
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

          <p className="mt-5 text-center text-[10px] md:text-xs text-zinc-400">
            Sua experiência será personalizada de acordo com sua escolha.
          </p>

          <div className="mt-5 flex items-center justify-between px-1">
            <a
              href="/afiliado"
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600"
            >
              Afiliadas
            </a>
            <a
              href="/representantes"
              className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-600"
            >
              Representantes
            </a>
          </div>
        </section>
      </main>
    </>
  )
}

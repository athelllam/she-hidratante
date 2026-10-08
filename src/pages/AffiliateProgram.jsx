import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'

const badgeAssets = {
  bronze: '/badge-bronze.svg',
  silver: '/badge-silver.svg',
  gold: '/badge-gold.svg',
}

function brl(value) {
  return (Number(value) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function integer(value) {
  return Math.round(Number(value) || 0).toLocaleString('pt-BR')
}

function ArrowIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  )
}

function SparkIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="m12 2 1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2Z" />
      <path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" />
    </svg>
  )
}

function UsersIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.8 20a5.2 5.2 0 0 1 10.4 0" />
      <path d="M16 5.7a3 3 0 0 1 0 5.6M17 14.2a4.7 4.7 0 0 1 3.2 4.3" />
    </svg>
  )
}

function LevelBar({ levels }) {
  return (
    <div className="relative mt-9 px-2 md:px-5">
      <div className="absolute left-8 right-8 top-[34px] h-2 rounded-full bg-zinc-200 md:left-12 md:right-12" />
      <div className="relative grid grid-cols-3 gap-3">
        {levels.map((level) => (
          <div key={level.key} className="relative flex flex-col items-center text-center">
            <div className="relative z-10 flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white bg-white p-2 shadow-[0_8px_25px_rgba(0,0,0,.10)] md:h-[76px] md:w-[76px]">
              <img src={badgeAssets[level.key]} alt={`Nível ${level.name}`} className="h-full w-full object-contain" />
            </div>
            <p className={`mt-2 text-xs font-black uppercase tracking-[.12em] ${level.key === 'bronze' ? 'text-orange-700' : level.key === 'silver' ? 'text-zinc-500' : 'text-amber-600'}`}>{level.name}</p>
            <p className="mt-1 text-sm font-black text-zinc-950">{integer(level.sales)} <span className="text-[10px] font-bold text-zinc-400">vendas</span></p>
          </div>
        ))}
      </div>
    </div>
  )
}

function BonusCard({ title, value, description, tone = 'white' }) {
  const toneClass = tone === 'pink'
    ? 'border-pink-100 bg-pink-50/70'
    : tone === 'dark'
      ? 'border-zinc-800 bg-zinc-950 text-white'
      : 'border-zinc-100 bg-white'
  return (
    <motion.div whileHover={{ y: -4 }} className={`rounded-[1.7rem] border p-5 shadow-sm ${toneClass}`}>
      <p className={`text-[10px] font-black uppercase tracking-[.18em] ${tone === 'pink' ? 'text-pink-500' : tone === 'dark' ? 'text-white/45' : 'text-zinc-400'}`}>{title}</p>
      {value && <p className={`mt-3 text-2xl font-black ${tone === 'pink' ? 'text-pink-600' : tone === 'dark' ? 'text-white' : 'text-zinc-950'}`}>{value}</p>}
      <p className={`mt-2 text-sm leading-6 ${tone === 'dark' ? 'text-white/60' : 'text-zinc-500'}`}>{description}</p>
    </motion.div>
  )
}

export default function AffiliateProgram() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loadingSettings, setLoadingSettings] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/affiliate/auth?action=public_settings')
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || 'Não foi possível carregar as configurações.')
        return data.settings
      })
      .then((data) => {
        if (!active) return
        setSettings(data)
        setLoadingSettings(false)
      })
      .catch(() => {
        if (!active) return
        setLoadingSettings(false)
      })
    return () => { active = false }
  }, [])

  if (loadingSettings) {
    return (
      <div className="min-h-screen bg-[#fffafc] text-zinc-950 flex items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-3xl bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 animate-pulse"><SparkIcon className="w-7 h-7" /></div>
          <p className="mt-5 text-sm font-black text-zinc-700">Carregando o programa atual da She…</p>
          <p className="mt-1 text-xs text-zinc-400">Os valores desta página vêm das configurações do painel.</p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#fffafc] flex items-center justify-center px-5">
        <div className="w-full max-w-md rounded-[2rem] bg-white border border-zinc-100 shadow-lg p-7 text-center">
          <h1 className="text-2xl font-black">Não foi possível carregar o programa</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Atualize a página para tentar novamente.</p>
          <Link to="/" className="mt-6 inline-flex rounded-2xl bg-zinc-950 px-6 py-3 text-sm font-black text-white">Voltar ao início</Link>
        </div>
      </div>
    )
  }

  const cfg = settings
  const monthly = cfg.monthlyLevels || {}
  const fixed = cfg.fixedLevels || {}
  const bonuses = cfg.commissions || {}
  const ticketBonus = Number(cfg.ticketBonus || 0)
  const teamSaleBonus = Number(cfg.teamCommissionPerSale || 0)
  const maximumPersonal = Number(bonuses.gold || 0) + ticketBonus + teamSaleBonus

  const monthlyLevels = [
    { key: 'none', name: 'Início', value: bonuses.none, sales: 0 },
    { key: 'bronze', name: 'Bronze', value: bonuses.bronze, sales: monthly.bronze },
    { key: 'silver', name: 'Prata', value: bonuses.silver, sales: monthly.silver },
    { key: 'gold', name: 'Ouro', value: bonuses.gold, sales: monthly.gold },
  ]
  const levelBar = monthlyLevels.slice(1)

  return (
    <div className="min-h-screen bg-[#fffafc] text-zinc-950 overflow-x-hidden">
      <Navbar buttonLabel="Acessar" onBuy={() => navigate('/afiliado')} />

      <main>
        <section className="relative pt-36 md:pt-44 pb-20 md:pb-28 px-5 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 left-[4%] w-[460px] h-[460px] rounded-full bg-pink-200/35 blur-3xl" />
            <div className="absolute top-[4%] right-[-100px] w-[560px] h-[560px] rounded-full bg-fuchsia-200/25 blur-3xl" />
            <div className="absolute bottom-[-180px] left-[30%] w-[560px] h-[400px] rounded-full bg-amber-100/35 blur-3xl" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-[1.02fr_.98fr] gap-14 lg:gap-20 items-center">
            <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <p className="inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white/75 px-4 py-2 text-[11px] font-black uppercase tracking-[.2em] text-pink-600 shadow-sm">
                <SparkIcon className="w-4 h-4" /> Programa de Afiliadas She
              </p>
              <h1 className="mt-6 text-5xl md:text-7xl lg:text-[5.9rem] font-black tracking-tight leading-[.9] max-w-4xl">
                Sua influência
                <br />
                <span className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-500 bg-clip-text text-transparent">pode crescer com você.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg md:text-xl leading-8 text-zinc-600">
                Um programa pensado para transformar conteúdo, relacionamento e vendas em uma trajetória real de crescimento — com metas claras, níveis, equipe e cinco formas de bonificação.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link to="/afiliado" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-7 py-4 text-base font-black text-white shadow-[0_16px_45px_rgba(236,72,153,0.26)] transition hover:-translate-y-0.5">
                  Quero ser afiliada <ArrowIcon />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2"><SparkIcon className="w-4 h-4 text-pink-500" /> Valores definidos no painel</span>
                <span className="inline-flex items-center gap-2"><UsersIcon className="w-4 h-4 text-pink-500" /> Crescimento com equipe</span>
                <span className="inline-flex items-center gap-2"><SparkIcon className="w-4 h-4 text-pink-500" /> Bonificação por evolução</span>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: .96, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: .9, delay: .1 }} className="relative">
              <div className="absolute inset-8 rounded-[3rem] bg-gradient-to-br from-pink-200/60 via-fuchsia-100/50 to-amber-100/55 blur-2xl" />
              <div className="relative rounded-[3rem] border border-white/90 bg-white/75 backdrop-blur-xl p-6 md:p-8 shadow-[0_35px_100px_rgba(0,0,0,.10)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[.2em] font-black text-pink-500">Sua jornada</p>
                    <h2 className="mt-2 text-2xl md:text-3xl font-black">Do primeiro passo ao Ouro.</h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 border border-pink-100 text-pink-500 flex items-center justify-center"><SparkIcon /></div>
                </div>
                <LevelBar levels={levelBar} />
                <div className="mt-8 rounded-[1.75rem] bg-zinc-950 text-white p-5 md:p-6">
                  <p className="text-[10px] uppercase tracking-[.2em] text-white/45 font-black">Potencial pessoal</p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-3xl md:text-4xl font-black">{brl(maximumPersonal)}</span>
                    <span className="text-sm text-white/55 mb-1">/pedido no Ouro + Bônus de Valor + Venda de Equipe</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/45">No Ouro, o potencial soma a bonificação do nível, o Bônus de Valor e a Venda de Equipe, conforme as configurações vigentes.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-5 py-16 md:py-22 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">O plano She</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Cinco formas de construir sua bonificação.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-500">Na She, oferecemos 5 tipos de bonificação que se combinam de maneiras diferentes para valorizar sua evolução, suas vendas e sua equipe.</p>
            </div>
            <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <BonusCard title="Bônus de Equipe" description={`Bronze garantido por ${integer(cfg.teamBonusDays)} dias ao entrar em uma equipe.`} />
              <BonusCard title="Bônus Fixo" description="Seu histórico de vendas acumuladas pode transformar seu nível em um piso permanente." />
              <BonusCard title="Bônus Mensal" description="Suas vendas no mês definem seu nível e a bonificação aplicada às vendas do mês" />
              <BonusCard title="Bônus de Valor" description={`Vender dois ou mais produtos no mesmo pedido pode aumentar a sua bonificação`} />
              <BonusCard title="Bônus de Venda de Equipe" description={`Treine sua equipe, as vendas dela geram uma bonificação adicional`} />
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[.85fr_1.15fr] gap-14 items-center">
            <div className="rounded-[2.5rem] bg-zinc-950 text-white p-7 md:p-9 shadow-[0_24px_80px_rgba(0,0,0,.14)]">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.2em] text-pink-300">Bônus de Equipe</p>
                  <h2 className="mt-4 text-4xl md:text-5xl font-black leading-[.95]">Uma vantagem real para começar acompanhada.</h2>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-pink-500/15 text-pink-300 flex items-center justify-center shrink-0"><UsersIcon className="w-7 h-7" /></div>
              </div>
              <p className="mt-6 text-base leading-7 text-white/65">Ao entrar em uma equipe, você recebe Bronze garantido por {integer(cfg.teamBonusDays)} dias corridos. O prazo começa na data e hora da entrada e não é reiniciado no primeiro dia do mês.</p>
              <div className="mt-7 rounded-[1.75rem] bg-white/5 border border-white/10 p-5">
                <p className="text-sm font-black">Depois do período</p>
                <p className="mt-2 text-sm leading-6 text-white/55">Quando os {integer(cfg.teamBonusDays)} dias terminam, o Bônus de Equipe deixa de ser o piso e você segue pelo maior nível entre o Bônus Fixo e o Bônus Mensal.</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Bônus de Equipe</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Comece acompanhada e tenha uma base para sua evolução.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-500">O Bônus de Equipe garante o nível Bronze durante os primeiros {integer(cfg.teamBonusDays)} dias após sua entrada em uma equipe.</p>
              <div className="mt-8 grid md:grid-cols-2 gap-4">
                <div className="rounded-[1.8rem] border border-pink-100 bg-pink-50/60 p-6">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">30 dias de Bronze</p>
                  <h3 className="mt-3 text-xl font-black">Seu ponto de partida</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">Ao entrar em uma equipe, você recebe Bronze garantido por {integer(cfg.teamBonusDays)} dias corridos. O prazo começa na data e hora da entrada e não é reiniciado no primeiro dia do mês.</p>
                </div>
                <div className="rounded-[1.8rem] border border-zinc-100 bg-zinc-50 p-6">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-zinc-400">Depois do período</p>
                  <h3 className="mt-3 text-xl font-black">Sua evolução continua</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">Quando os {integer(cfg.teamBonusDays)} dias terminam, o Bônus de Equipe deixa de ser o piso e você segue pelo maior nível entre o Bônus Fixo e o Bônus Mensal.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_.9fr] gap-14 items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-zinc-400">Bônus Fixo</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">O seu histórico continua trabalhando por você.</h2>
              <p className="mt-5 max-w-2xl text-base md:text-lg leading-8 text-zinc-500">O Bônus Fixo acompanha suas vendas pessoais acumuladas. Quando você atinge o marco definido para um nível, ele se torna seu nível-base permanente.</p>
              <div className="mt-10 grid md:grid-cols-3 gap-4">
                {[
                  ['bronze', bonuses.bronze],
                  ['silver', bonuses.silver],
                  ['gold', bonuses.gold],
                ].map(([key, value]) => (
                  <motion.div key={key} whileHover={{ y: -4 }} className="rounded-[1.8rem] border border-zinc-100 bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm">
                    <img src={badgeAssets[key]} alt={`Nível ${key}`} className="w-14" />
                    <p className="mt-4 text-xs font-black uppercase tracking-[.16em] text-zinc-400">Bonificação</p>
                    <p className="mt-2 text-2xl font-black text-zinc-950">{brl(value)}</p>
                    <p className="text-xs text-zinc-400">por venda</p>
                    <p className="mt-3 text-sm font-black text-zinc-700">Meta: {integer(fixed[key])} vendas acumuladas</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="rounded-[2.4rem] bg-zinc-950 text-white p-7 md:p-9 shadow-[0_24px_80px_rgba(0,0,0,.14)]">
              <p className="text-[10px] uppercase tracking-[.2em] text-white/45 font-black">Como funciona</p>
              <div className="mt-7 space-y-6">
                <div><p className="text-base font-black">Seu histórico acumula</p><p className="mt-2 text-sm leading-6 text-white/60">As vendas pessoais acumuladas fazem você avançar nos níveis do Bônus Fixo.</p></div>
                <div><p className="text-base font-black">O nível conquistado permanece</p><p className="mt-2 text-sm leading-6 text-white/60">Ao atingir o marco de um nível, ele passa a ser seu nível-base permanente para os próximos meses.</p></div>
                <div><p className="text-base font-black">Ele protege sua evolução mensal</p><p className="mt-2 text-sm leading-6 text-white/60">O novo mês começa em Início ou, se você já conquistou um Bônus Fixo, no nível permanente correspondente.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="niveis" className="px-5 py-20 md:py-28 bg-[#fff5f8]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Bônus Mensal</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Seu nível deixa de ser abstrato. Ele vira conquista.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-600">Suas vendas no mês definem seu nível e a bonificação aplicada às vendas do mês.</p>
            </div>

            <div className="mt-10 rounded-[2.5rem] border border-pink-100 bg-white p-6 md:p-9 shadow-sm">
              <LevelBar levels={levelBar} />
              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {monthlyLevels.map((level) => (
                  <div key={level.key} className={`rounded-[1.7rem] border p-5 ${level.key === 'none' ? 'border-zinc-200 bg-zinc-50' : level.key === 'gold' ? 'border-amber-200 bg-amber-50/70' : level.key === 'silver' ? 'border-zinc-200 bg-zinc-50' : 'border-orange-200 bg-orange-50/70'}`}>
                    <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Nível</p>
                    <h3 className="mt-2 text-xl font-black text-zinc-950">{level.name}</h3>
                    <p className="mt-2 text-2xl font-black text-zinc-950">{brl(level.value)}<span className="ml-1 text-xs font-bold text-zinc-400">/venda</span></p>
                    <p className="mt-2 text-sm leading-6 text-zinc-500">Bonificação aplicada às vendas elegíveis do mês quando este nível estiver vigente.</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-[1.8rem] bg-zinc-950 p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/45">O detalhe que faz diferença</p>
                <p className="mt-3 text-sm md:text-base leading-7 text-white/70">A cada mês, você evolui pelos níveis, e a bonificação correspondente ao nível alcançado passa a valer retroativamente para todas as vendas pessoais realizadas naquele mês. As vendas de sua equipe entram na soma para ajudar a alcançar novos níveis, mas a bonificação é aplicada somente às vendas pessoais.</p>
                <p className="mt-3 text-sm md:text-base leading-7 text-white/70">No início de cada mês, o progresso do Bônus Mensal reinicia para Início ou para o nível definido pelo seu Bônus Fixo.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-[#fffafc]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1fr] gap-14 items-center">
            <div className="relative overflow-hidden rounded-[2.6rem] bg-gradient-to-br from-pink-500 via-fuchsia-500 to-rose-500 p-[1px] shadow-[0_30px_100px_rgba(236,72,153,.17)]">
              <div className="rounded-[2.55rem] bg-white p-7 md:p-9">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-pink-50 border border-pink-100 text-pink-500 flex items-center justify-center"><SparkIcon className="w-7 h-7" /></div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[.2em] text-pink-500 font-black">Bônus de Valor</p>
                    <h2 className="mt-1 text-3xl md:text-4xl font-black">Venda melhor, não só mais.</h2>
                  </div>
                </div>
                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  <div className="rounded-[1.7rem] bg-zinc-50 border border-zinc-100 p-6">
                    <p className="text-xs font-black uppercase tracking-[.15em] text-zinc-400">Meta de valor do pedido</p>
                    <p className="mt-2 text-3xl font-black">{brl(cfg.ticketThreshold)}</p>
                    <p className="mt-1 text-xs text-zinc-400">média dos seus pedidos</p>
                  </div>
                  <div className="rounded-[1.7rem] bg-pink-50 border border-pink-100 p-6">
                    <p className="text-xs font-black uppercase tracking-[.15em] text-pink-500">Bônus de Valor</p>
                    <p className="mt-2 text-3xl font-black text-pink-600">+{brl(ticketBonus)}</p>
                    <p className="mt-1 text-xs text-pink-500">por pedido elegível</p>
                  </div>
                </div>
                <p className="mt-6 text-sm leading-7 text-zinc-500">Vendas de 2 unidades ou mais ajudam a elevar o valor médio dos seus pedidos. A meta é manter sua média acima de {brl(cfg.ticketThreshold)}. O Bônus de Valor considera o acumulado de todas as suas vendas no período e, quando a meta é superada, acrescenta {brl(ticketBonus)} por pedido elegível.</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Potencial de ganhos</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">No Ouro, seu potencial pode chegar a {brl(maximumPersonal)} por pedido.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-500">Essa soma considera a bonificação do nível Ouro + o Bônus de Valor + a Venda de Equipe, sempre acompanhando os valores configurados no painel administrativo.</p>

            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-[#fffafc]">
          <div className="max-w-7xl mx-auto">
                        <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Venda de Equipe</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Sua equipe também pode gerar bonificação para você.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-500">Quando uma afiliada diretamente ligada à sua equipe realiza uma venda elegível, você recebe a bonificação de Venda de Equipe configurada no programa.</p>
              <div className="mt-8 rounded-[1.8rem] border border-pink-100 bg-pink-50/60 p-7">
                <p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">Valor atual</p>
                <p className="mt-2 text-4xl font-black text-zinc-950">{brl(teamSaleBonus)} <span className="text-base font-bold text-zinc-400">/ venda elegível</span></p>
                <p className="mt-3 text-sm leading-6 text-zinc-500">Esse valor acompanha diretamente a configuração do painel administrativo.</p>
              </div>
              <div className="mt-8 grid md:grid-cols-2 gap-4">
                <div className="rounded-[1.8rem] border border-zinc-100 bg-zinc-50 p-6">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-zinc-400">Afiliada mãe</p>
                  <h3 className="mt-3 text-xl font-black">Quem lidera sua entrada</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">É a afiliada diretamente acima de você na estrutura.</p>
                </div>
                <div className="rounded-[1.8rem] border border-pink-100 bg-pink-50 p-6">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">Afiliadas filhas</p>
                  <h3 className="mt-3 text-xl font-black">Sua rede direta</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">São as afiliadas que entram diretamente na sua equipe e ajudam a ampliar o resultado da sua rede.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="rounded-[2.75rem] bg-gradient-to-r from-pink-500 via-fuchsia-500 to-rose-500 p-[1px] shadow-[0_30px_100px_rgba(236,72,153,.18)]">
              <div className="rounded-[2.7rem] bg-white px-7 py-10 md:px-12 md:py-14 text-center">
                <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Seu próximo passo</p>
                <h2 className="mt-4 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Você não precisa esperar para começar a crescer.</h2>
                <p className="mt-5 mx-auto max-w-2xl text-base md:text-lg leading-8 text-zinc-500">Entre para a She, crie seu link, venda, suba de nível e construa sua própria rede.</p>
                <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                  <Link to="/afiliado" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-7 py-4 text-base font-black text-white transition hover:bg-pink-500">Acessar área de afiliadas <ArrowIcon /></Link>
                  <Link to="/termos-afiliadas" className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-7 py-4 text-base font-black text-zinc-800 transition hover:border-pink-300 hover:text-pink-600">Ver termos do programa</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="relative bg-[#fff0f5] px-5 py-16 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center">
            <Link to="/" className="inline-flex items-center justify-center text-4xl md:text-5xl font-black tracking-tight text-zinc-950">SHE</Link>
            <p className="mt-4 text-sm text-zinc-500">Programa de Afiliadas She</p>
            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs font-semibold text-zinc-400">
              <Link to="/termos-afiliadas" className="hover:text-zinc-600">Termos de Afiliadas</Link>
              <Link to="/representantes" className="hover:text-zinc-600">Representantes</Link>
              <Link to="/" className="hover:text-zinc-600">Início</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

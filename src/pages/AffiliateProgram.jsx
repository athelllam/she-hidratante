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

function pluralSales(value) {
  return Number(value) === 1 ? 'venda' : 'vendas'
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

function Step({ number, title, text }) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-11 h-11 rounded-2xl bg-zinc-950 text-white flex items-center justify-center font-black">{number}</div>
      <div>
        <h3 className="font-black text-zinc-950 text-base md:text-lg">{title}</h3>
        <p className="mt-1.5 text-sm leading-6 text-zinc-500">{text}</p>
      </div>
    </div>
  )
}

function BadgeCard({ level, sales, commission, description }) {
  const tone = {
    bronze: 'from-orange-50 via-white to-amber-50 border-orange-200 text-orange-700',
    silver: 'from-zinc-50 via-white to-slate-50 border-zinc-200 text-zinc-700',
    gold: 'from-amber-50 via-yellow-50 to-white border-amber-200 text-amber-700',
  }[level.key]

  return (
    <motion.article whileHover={{ y: -7 }} className={`relative overflow-hidden rounded-[2.25rem] border bg-gradient-to-br ${tone} p-6 md:p-7 shadow-[0_18px_50px_rgba(0,0,0,0.05)]`}>
      <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-white/60 blur-2xl" />
      <div className="relative flex items-center gap-4">
        <div className="w-[82px] h-[82px] rounded-[1.65rem] bg-white/85 border border-white shadow-sm flex items-center justify-center p-3">
          <img src={badgeAssets[level.key]} alt={`Broche ${level.name}`} className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">Nível</p>
          <h3 className="mt-1 text-3xl font-black tracking-tight">{level.name}</h3>
        </div>
      </div>
      <div className="relative mt-7 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/80 border border-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Meta mensal</p>
          <p className="mt-1 text-xl font-black text-zinc-950">{integer(sales)}</p>
          <p className="text-xs text-zinc-400">{pluralSales(sales)}</p>
        </div>
        <div className="rounded-2xl bg-white/80 border border-white p-4">
          <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Comissão</p>
          <p className="mt-1 text-xl font-black text-zinc-950">{brl(commission)}</p>
          <p className="text-xs text-zinc-400">por venda</p>
        </div>
      </div>
      <p className="relative mt-5 text-sm leading-6 text-zinc-500">{description}</p>
    </motion.article>
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
      .catch((error) => {
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
  const monthly = cfg.monthlyLevels
  const fixed = cfg.fixedLevels
  const commissions = cfg.commissions
  const boost = cfg.boostPlans
  const maximumPersonal = Number(commissions.gold || 0) + Number(cfg.ticketBonus || 0)

  const badgeLevels = [
    {
      key: 'bronze',
      name: 'Bronze',
      sales: monthly.bronze,
      commission: commissions.bronze,
      description: `Você alcança este nível a partir de ${integer(monthly.bronze)} ${pluralSales(monthly.bronze)} no mês.`
    },
    {
      key: 'silver',
      name: 'Prata',
      sales: monthly.silver,
      commission: commissions.silver,
      description: `A partir de ${integer(monthly.silver)} ${pluralSales(monthly.silver)} no mês, você entra no Prata.`
    },
    {
      key: 'gold',
      name: 'Ouro',
      sales: monthly.gold,
      commission: commissions.gold,
      description: `A partir de ${integer(monthly.gold)} ${pluralSales(monthly.gold)} no mês, você chega ao nível máximo.`
    },
  ]

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
                Um programa pensado para transformar conteúdo, relacionamento e vendas em uma trajetória real de crescimento — com metas claras, níveis, equipe e recompensas.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-3">
                <Link to="/afiliado" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 px-7 py-4 text-base font-black text-white shadow-[0_16px_45px_rgba(236,72,153,0.26)] transition hover:-translate-y-0.5">
                  Quero ser afiliada <ArrowIcon />
                </Link>
                <a href="#niveis" className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 bg-white/80 px-7 py-4 text-base font-black text-zinc-800 transition hover:border-pink-300 hover:text-pink-600">
                  Conhecer os níveis
                </a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-500">
                <span className="inline-flex items-center gap-2"><SparkIcon className="w-4 h-4 text-pink-500" /> Metas definidas no painel</span>
                <span className="inline-flex items-center gap-2"><UsersIcon className="w-4 h-4 text-pink-500" /> Crescimento com equipe</span>
                <span className="inline-flex items-center gap-2"><SparkIcon className="w-4 h-4 text-pink-500" /> Benefícios por evolução</span>
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
                <div className="mt-8 grid grid-cols-3 gap-3 items-end">
                  {badgeLevels.map((level, index) => (
                    <motion.div key={level.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .25 + index * .12 }} className={`rounded-[2rem] p-4 border bg-white shadow-sm text-center ${index === 1 ? 'pb-7' : index === 2 ? 'pb-10' : ''}`}>
                      <img src={badgeAssets[level.key]} alt={`Broche ${level.name}`} className="w-20 md:w-24 mx-auto" />
                      <p className="mt-2 text-sm font-black">{level.name}</p>
                      <p className="mt-1 text-[11px] text-zinc-400">{integer(level.sales)} {pluralSales(level.sales)}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-7 rounded-[1.75rem] bg-zinc-950 text-white p-5 md:p-6">
                  <p className="text-[10px] uppercase tracking-[.2em] text-white/45 font-black">Potencial pessoal</p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                    <span className="text-3xl md:text-4xl font-black">{brl(maximumPersonal)}</span>
                    <span className="text-sm text-white/55 mb-1">/pedido no Ouro + bônus de ticket</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-white/45">O bônus de ticket entra quando o ticket médio do mês fica acima da meta configurada.</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>


        <section id="niveis" className="px-5 py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Broches She</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Seu nível deixa de ser abstrato. Ele vira conquista.</h2>
            </div>
            <div className="mt-12 grid lg:grid-cols-3 gap-5">
              {badgeLevels.map(level => <BadgeCard key={level.key} level={level} sales={level.sales} commission={level.commission} description={level.description} />)}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-[#fff5f8]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[.9fr_1.1fr] gap-14 items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Bônus Mensal</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Todo mês começa uma nova corrida.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-600">No dia 1, o ciclo mensal reinicia. O mês anterior fica congelado, e o novo mês começa considerando o seu Bônus Fixo como nível-base.</p>
              <div className="mt-7 rounded-[1.8rem] border border-pink-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-black text-zinc-950">O detalhe que faz diferença</p>
                <p className="mt-2 text-sm leading-7 text-zinc-500">Ao alcançar um novo nível durante o mês, as vendas daquele mesmo mês passam a receber a comissão correspondente ao nível alcançado.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {badgeLevels.map((level, index) => (
                <motion.div key={level.key} whileHover={{ y: -5 }} className={`rounded-[2rem] p-6 bg-white border shadow-sm ${index === 0 ? 'border-orange-100' : index === 1 ? 'border-zinc-200' : 'border-amber-100'}`}>
                  <img src={badgeAssets[level.key]} alt={`Broche ${level.name}`} className="w-16" />
                  <h3 className="mt-5 text-xl font-black">{level.name}</h3>
                  <p className="mt-2 text-sm font-bold text-zinc-700">{integer(level.sales)} {pluralSales(level.sales)} no mês</p>
                  <p className="mt-4 text-3xl font-black text-zinc-950">{brl(level.commission)}</p>
                  <p className="text-xs text-zinc-400">por venda</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-white">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.1fr_.9fr] gap-14 items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-zinc-400">Bônus Fixo</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">O seu histórico continua trabalhando por você.</h2>
              <p className="mt-5 max-w-2xl text-base md:text-lg leading-8 text-zinc-500">O Bônus Fixo acompanha as suas vendas pessoais acumuladas e cria um piso permanente para sua evolução mensal.</p>
              <div className="mt-10 grid md:grid-cols-3 gap-4">
                {[
                  ['bronze', fixed.bronze],
                  ['silver', fixed.silver],
                  ['gold', fixed.gold],
                ].map(([key, sales]) => (
                  <motion.div key={key} whileHover={{ y: -4 }} className="rounded-[1.8rem] border border-zinc-100 bg-gradient-to-br from-white to-zinc-50 p-6 shadow-sm">
                    <img src={badgeAssets[key]} alt={`Broche ${key}`} className="w-14" />
                    <p className="mt-4 text-xs font-black uppercase tracking-[.16em] text-zinc-400">Meta acumulada</p>
                    <p className="mt-2 text-2xl font-black text-zinc-950">{integer(sales)}</p>
                    <p className="text-xs text-zinc-400">{pluralSales(sales)}</p>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="rounded-[2.4rem] bg-zinc-950 text-white p-7 md:p-9 shadow-[0_24px_80px_rgba(0,0,0,.14)]">
              <p className="text-[10px] uppercase tracking-[.2em] text-white/45 font-black">Como tudo se combina</p>
              <div className="mt-7 space-y-6">
                <Step number="1" title="Bônus Fixo" text={`Atingindo ${integer(fixed.bronze)}, ${integer(fixed.silver)} e ${integer(fixed.gold)} vendas acumuladas, você cria seu nível-base permanente.`} />
                <Step number="2" title="Bônus Mensal" text={`No mês atual, a sua evolução acompanha as metas de ${integer(monthly.bronze)}, ${integer(monthly.silver)} e ${integer(monthly.gold)} ${pluralSales(monthly.gold)}.`} />
                <Step number="3" title="O melhor nível prevalece" text="Sua evolução mensal pode subir acima do piso, mas o Bônus Mensal nunca reduz o nível permanente já conquistado pelo Bônus Fixo." />
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
                    <p className="text-[10px] uppercase tracking-[.2em] text-pink-500 font-black">Meta de Ticket Médio</p>
                    <h2 className="mt-1 text-3xl md:text-4xl font-black">Venda melhor, não só mais.</h2>
                  </div>
                </div>
                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  <div className="rounded-[1.7rem] bg-zinc-50 border border-zinc-100 p-6">
                    <p className="text-xs font-black uppercase tracking-[.15em] text-zinc-400">Meta atual</p>
                    <p className="mt-2 text-3xl font-black">{brl(cfg.ticketThreshold)}</p>
                    <p className="mt-1 text-xs text-zinc-400">ticket médio</p>
                  </div>
                  <div className="rounded-[1.7rem] bg-pink-50 border border-pink-100 p-6">
                    <p className="text-xs font-black uppercase tracking-[.15em] text-pink-500">Bônus</p>
                    <p className="mt-2 text-3xl font-black text-pink-600">+{brl(cfg.ticketBonus)}</p>
                    <p className="mt-1 text-xs text-pink-500">por pedido elegível</p>
                  </div>
                </div>
                <p className="mt-6 text-sm leading-7 text-zinc-500">Quando o ticket médio do mês supera a meta configurada, entra o bônus adicional por pedido elegível. É uma recompensa para quem aprende a vender kits, combinações e soluções de maior valor.</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Potencial de ganhos</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">No Ouro, sua comissão pessoal pode chegar a {brl(maximumPersonal)} por venda.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-500">Essa soma considera a comissão do nível Ouro mais o bônus de ticket configurado. O valor exibido acompanha o painel administrativo.</p>
              <div className="mt-8 rounded-[1.8rem] border border-zinc-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-black">E ainda existe a equipe</p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-4xl font-black">+{brl(cfg.teamCommissionPerSale)}</span>
                  <span className="text-sm text-zinc-400 mb-1">por venda elegível de uma afiliada direta</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-500">A comissão de equipe é separada da sua comissão pessoal e segue a configuração vigente do programa.</p>
              </div>
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
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Sistema de equipes</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Você pode construir uma rede de mulheres ao seu lado.</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-500">Na She, cada afiliada pode ter uma afiliada mãe e também desenvolver sua própria equipe de afiliadas filhas.</p>
              <div className="mt-8 grid md:grid-cols-2 gap-4">
                <div className="rounded-[1.8rem] border border-zinc-100 bg-zinc-50 p-6">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-zinc-400">Afiliada mãe</p>
                  <h3 className="mt-3 text-xl font-black">Quem lidera sua entrada</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">É a afiliada diretamente acima de você na estrutura. Quando sua entrada é impulsionada, o sistema define essa conexão.</p>
                </div>
                <div className="rounded-[1.8rem] border border-pink-100 bg-pink-50 p-6">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-pink-500">Afiliadas filhas</p>
                  <h3 className="mt-3 text-xl font-black">Sua rede direta</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">São as afiliadas que entram diretamente na sua equipe e ajudam você a ampliar o resultado da sua rede.</p>
                </div>
              </div>
              <div className="mt-6 rounded-[1.8rem] border border-zinc-100 bg-white p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shrink-0"><UsersIcon /></div>
                  <div>
                    <h3 className="text-xl font-black">Orgânico ou Impulsionado</h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-500"><strong className="text-zinc-900">Orgânico:</strong> você indica diretamente e não consome conexão. <strong className="text-zinc-900">Impulsionado:</strong> a She distribui novas afiliadas para os impulsos ativos e a conexão só é consumida quando a entrada é efetivamente confirmada.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:py-28 bg-[#fff5f8]">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[.9fr_1.1fr] gap-14 items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Impulsionar Equipe</p>
              <h2 className="mt-3 text-4xl md:text-6xl font-black tracking-tight leading-[.95]">Quer crescer sua equipe mais rápido?</h2>
              <p className="mt-5 text-base md:text-lg leading-8 text-zinc-600">Você pode comprar conexões e entrar em uma fila única. O sistema distribui novas afiliadas entre os impulsos ativos de forma contínua.</p>
              <div className="mt-8 rounded-[1.8rem] bg-zinc-950 text-white p-6 md:p-7">
                <p className="text-[10px] uppercase tracking-[.2em] text-white/45 font-black">A jornada do impulso</p>
                <div className="mt-5 space-y-4 text-sm text-white/75">
                  <p><strong className="text-white">1.</strong> Escolha um plano de {brl(boost.small.price)} ou {brl(boost.large.price)}.</p>
                  <p><strong className="text-white">2.</strong> O valor é reservado e você entra na fila.</p>
                  <p><strong className="text-white">3.</strong> Quando houver capacidade, o impulso é ativado.</p>
                  <p><strong className="text-white">4.</strong> Cada nova entrada confirmada consome uma conexão.</p>
                  <p><strong className="text-white">5.</strong> Ao terminar as conexões, o impulso é concluído automaticamente.</p>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-5">
              <motion.div whileHover={{ y: -5 }} className="rounded-[2.25rem] border border-pink-100 bg-white p-7 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[.18em] text-pink-500">Plano</p>
                <h3 className="mt-4 text-4xl font-black">{brl(boost.small.price)}</h3>
                <p className="mt-2 text-sm text-zinc-500">{integer(boost.small.connections)} {pluralSales(boost.small.connections)} de conexão</p>
                <div className="mt-6 flex items-center gap-2">
                  {Array.from({ length: Math.min(6, Number(boost.small.connections) || 0) }).map((_, i) => <span key={i} className="h-2 flex-1 rounded-full bg-pink-200" />)}
                </div>
              </motion.div>
              <motion.div whileHover={{ y: -5 }} className="rounded-[2.25rem] border border-fuchsia-100 bg-gradient-to-br from-white via-pink-50 to-fuchsia-50 p-7 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-500">Plano</p>
                <h3 className="mt-4 text-4xl font-black">{brl(boost.large.price)}</h3>
                <p className="mt-2 text-sm text-zinc-500">{integer(boost.large.connections)} {pluralSales(boost.large.connections)} de conexão</p>
                <div className="mt-6 flex items-center gap-2">
                  {Array.from({ length: Math.min(6, Number(boost.large.connections) || 0) }).map((_, i) => <span key={i} className="h-2 flex-1 rounded-full bg-fuchsia-200" />)}
                </div>
              </motion.div>
              <div className="md:col-span-2 rounded-[2.25rem] border border-zinc-100 bg-white p-7 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shrink-0"><UsersIcon className="w-7 h-7" /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[.16em] text-zinc-400">Capacidade do sistema</p>
                    <h3 className="mt-2 text-2xl font-black">Até {integer(boost.maxActive)} impulsos ativos ao mesmo tempo</h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-500">Os dois planos compartilham a mesma fila. A posição depende de quando você entrou e a distribuição segue o ciclo entre os impulsos ativos.</p>
                  </div>
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

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

function brl(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function monthLabel(value) {
  if (!value) return ''
  const [year, month] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
    .replace(/^./, char => char.toUpperCase())
}

function periodLabel(value) {
  if (value === 'all') return 'Todos os meses'
  return monthLabel(value)
}

function shortDate(value) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}`
}

function withdrawalStatusLabel(status) {
  if (status === 'approved') return 'Aprovado'
  if (status === 'paid') return 'Pago'
  if (status === 'rejected') return 'Recusado'
  if (status === 'cancelled') return 'Cancelado'
  return 'Pendente'
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a operação.')
  return data
}

function levelTone(key) {
  if (key === 'gold') return 'from-amber-200 via-yellow-100 to-amber-50'
  if (key === 'silver') return 'from-zinc-200 via-white to-zinc-100'
  if (key === 'bronze') return 'from-orange-200 via-orange-100 to-amber-50'
  return 'from-pink-100 via-white to-zinc-50'
}

function levelAccent(key) {
  if (key === 'gold') return 'text-amber-700'
  if (key === 'silver') return 'text-zinc-600'
  if (key === 'bronze') return 'text-orange-700'
  return 'text-pink-500'
}

export default function AffiliateDashboard() {
  const [affiliate, setAffiliate] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [registerMode, setRegisterMode] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', email: '', password: '', whatsapp: '' })
  const [login, setLogin] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawMessage, setWithdrawMessage] = useState('')
  const [teamWithdrawAmount, setTeamWithdrawAmount] = useState('')
  const [teamWithdrawBusy, setTeamWithdrawBusy] = useState(false)
  const [teamWithdrawMessage, setTeamWithdrawMessage] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [teamJoinBusy, setTeamJoinBusy] = useState(false)
  const [teamJoinMessage, setTeamJoinMessage] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixOpen, setPixOpen] = useState(false)
  const [pixBusy, setPixBusy] = useState(false)
  const [pixMessage, setPixMessage] = useState('')
  const [levelHelpOpen, setLevelHelpOpen] = useState(false)
  const chartScrollRef = useRef(null)

  useEffect(() => {
    const node = chartScrollRef.current
    const chartData = dashboard?.chart || []
    if (selectedMonth === 'all' || !node || !chartData.length) return

    const lastDataIndex = [...chartData]
      .map((item, index) => ({ item, index }))
      .reverse()
      .find(({ item }) =>
        Number(item.revenue || 0) > 0 ||
        Number(item.sales || 0) > 0 ||
        Number(item.access || 0) > 0
      )?.index

    requestAnimationFrame(() => {
      if (lastDataIndex == null) {
        node.scrollLeft = 0
        return
      }

      const target = node.querySelector(`[data-chart-index="${lastDataIndex}"]`)
      if (!target) return

      node.scrollLeft = Math.max(
        0,
        target.offsetLeft - node.clientWidth + target.offsetWidth + 8
      )
    })
  }, [selectedMonth, dashboard?.chart])

  const load = async ({ sync = false, month = selectedMonth } = {}) => {
    try {
      const query = month ? `?month=${encodeURIComponent(month)}` : ''
      const data = await api(`/api/affiliate/dashboard${query}`)
      setAffiliate(data.affiliate)
      setPixKey(data.affiliate?.pix_key || '')
      setDashboard(data)
      if (data.selectedMonth) setSelectedMonth(data.selectedMonth)
      setLoading(false)

      if (sync) {
        setSyncing(true)
        setSyncMessage('Atualizando vendas…')
        try {
          const result = await api('/api/affiliate/yampi-sync', { method: 'POST', body: '{}' })
          if (result.configured === false) {
            setSyncMessage('Integração de vendas ainda não configurada.')
          } else {
            setSyncMessage(`${result.synced || 0} pedido(s) sincronizado(s).`)
            const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(data.selectedMonth || month)}`)
            setDashboard(refreshed)
          }
        } catch (e) {
          setSyncMessage(e.message || 'Não foi possível atualizar as vendas.')
        } finally {
          setSyncing(false)
        }
      }
    } catch {
      setAffiliate(null)
      setLoading(false)
    }
  }

  useEffect(() => { load({ sync: true }) }, [])

  const submitLogin = async (event) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await api('/api/affiliate/login', { method: 'POST', body: JSON.stringify(login) })
      await load({ sync: true })
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  const submitRegister = async (event) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      await api('/api/affiliate/register', { method: 'POST', body: JSON.stringify(form) })
      await load({ sync: true })
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  const logout = async () => {
    await api('/api/affiliate/logout', { method: 'POST' }).catch(() => {})
    setAffiliate(null)
    setDashboard(null)
  }

  const requestWithdraw = async (event) => {
    event.preventDefault()
    setWithdrawBusy(true)
    setWithdrawMessage('')
    try {
      const amount = Number(String(withdrawAmount).replace(',', '.'))
      await api('/api/affiliate/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, source: 'personal' }),
      })
      setWithdrawAmount('')
      setWithdrawMessage(`Solicitação enviada. ${brl(amount)} ficou reservado para análise.`)
      const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth)}`)
      setDashboard(refreshed)
    } catch (e) {
      setWithdrawMessage(e.message || 'Não foi possível solicitar o saque.')
    } finally {
      setWithdrawBusy(false)
    }
  }

  const joinTeam = async (event) => {
    event.preventDefault()
    setTeamJoinBusy(true)
    setTeamJoinMessage('')
    try {
      const result = await api('/api/affiliate/dashboard', {
        method: 'POST',
        body: JSON.stringify({ teamParentCode: teamCode.trim().toUpperCase() }),
      })
      setAffiliate(current => current ? { ...current, team_parent_id: result.affiliate?.team_parent_id || true } : current)
      setTeamJoinMessage('Você entrou na equipe com sucesso.')
      setTeamCode('')
      const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth)}`)
      setDashboard(refreshed)
    } catch (e) {
      setTeamJoinMessage(e.message || 'Não foi possível entrar na equipe.')
    } finally {
      setTeamJoinBusy(false)
    }
  }

  const requestTeamWithdraw = async (event) => {
    event.preventDefault()
    setTeamWithdrawBusy(true)
    setTeamWithdrawMessage('')
    try {
      const amount = Number(String(teamWithdrawAmount).replace(',', '.'))
      await api('/api/affiliate/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount, source: 'team' }),
      })
      setTeamWithdrawAmount('')
      setTeamWithdrawMessage(`Solicitação de saque de equipe enviada. ${brl(amount)} ficou reservado para análise.`)
      const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth)}`)
      setDashboard(refreshed)
    } catch (e) {
      setTeamWithdrawMessage(e.message || 'Não foi possível solicitar o saque de equipe.')
    } finally {
      setTeamWithdrawBusy(false)
    }
  }

  const savePix = async (event) => {
    event.preventDefault()
    setPixBusy(true)
    setPixMessage('')
    try {
      const result = await api('/api/affiliate/withdraw', {
        method: 'PATCH',
        body: JSON.stringify({ pixKey: pixKey.trim() }),
      })
      const saved = result.pixKey || pixKey.trim()
      setPixKey(saved)
      setAffiliate(current => current ? { ...current, pix_key: saved } : current)
      setPixOpen(false)
      setPixMessage('PIX de recebimento salvo. Se você cadastrar outro, ele substituirá o atual para os próximos saques.')
    } catch (e) {
      setPixMessage(e.message || 'Não foi possível salvar o PIX.')
    } finally {
      setPixBusy(false)
    }
  }

  const cards = useMemo(() => {
    const m = dashboard?.metrics || {}
    return [
      ['Acessos', m.accesses || 0],
      ['Vendas', m.sales || 0],
      ['Faturamento', brl(m.revenue)],
      ['Ticket médio', brl(m.averageTicket)],
      ['Comissão', brl(m.commission)],
    ]
  }, [dashboard])

  if (loading) return <main className="min-h-screen bg-[#fffafc]" />

  if (!affiliate) {
    return (
      <main className="min-h-screen bg-[#fffafc] flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(0,0,0,.10)] border border-pink-100">
          <div className="text-center">
            <p className="text-xs font-bold tracking-[.28em] text-pink-500 uppercase">She</p>
            <h1 className="mt-2 text-3xl font-black text-zinc-950">Área da afiliada</h1>
            <p className="mt-2 text-sm text-zinc-500">{registerMode ? 'Crie seu perfil e seu link exclusivo.' : 'Entre para acompanhar seus resultados.'}</p>
          </div>

          {!registerMode ? (
            <form onSubmit={submitLogin} className="mt-7 space-y-3">
              <input value={login.email} onChange={e => setLogin({...login,email:e.target.value})} type="email" required placeholder="E-mail" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={login.password} onChange={e => setLogin({...login,password:e.target.value})} type="password" required placeholder="Senha" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button disabled={busy} className="w-full rounded-2xl bg-pink-500 py-3.5 font-bold text-white disabled:opacity-60">{busy ? 'Entrando…' : 'Entrar'}</button>
            </form>
          ) : (
            <form onSubmit={submitRegister} className="mt-7 space-y-3">
              <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required placeholder="Seu nome" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.slug} onChange={e => setForm({...form,slug:e.target.value})} required placeholder="Seu link (ex.: ana)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.whatsapp} onChange={e => setForm({...form,whatsapp:e.target.value})} type="tel" required placeholder="WhatsApp (31) 99999-9999" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.email} onChange={e => setForm({...form,email:e.target.value})} type="email" required placeholder="E-mail" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.password} onChange={e => setForm({...form,password:e.target.value})} type="password" minLength={8} required placeholder="Senha (mín. 8 caracteres)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button disabled={busy} className="w-full rounded-2xl bg-pink-500 py-3.5 font-bold text-white disabled:opacity-60">{busy ? 'Criando…' : 'Criar conta'}</button>
            </form>
          )}

          <button type="button" onClick={() => { setRegisterMode(v => !v); setError('') }} className="mt-4 w-full text-sm font-bold text-pink-500">
            {registerMode ? 'Já tenho uma conta' : 'Quero ser afiliada'}
          </button>
        </div>
      </main>
    )
  }

  const chart = dashboard?.chart || []
  const maxRevenue = Math.max(1, ...chart.map(x => Number(x.revenue || 0)))

  const publicUrl = `${window.location.origin}/${affiliate.slug}`
  const qrUrl = `https://quickchart.io/qr?size=220&text=${encodeURIComponent(publicUrl)}`
  const config = dashboard?.settings || { ticketThreshold: 170, ticketBonus: 5, teamCommissionPerSale: 10, commissions: { none: 30, bronze: 40, silver: 50, gold: 60 } }
  const level = dashboard?.level || { key: 'none', label: 'Início', sales: 0, commissionPerOrder: Number(config.commissions?.none || 30), progress: 0, nextLevel: 'Bronze', nextMinSales: 10, salesToNext: 10 }
  const months = dashboard?.months?.length ? dashboard.months : [selectedMonth]
  const availableCommission = Number(dashboard?.metrics?.availableCommission || 0)
  const team = dashboard?.team || { code: affiliate.team_code || '', joined: false, canJoin: false, commissionPerSale: 10, earnedCommission: 0, availableCommission: 0, members: [] }

  return (
    <main className="min-h-screen bg-[#fffafc] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-pink-500">She Afiliadas</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-zinc-950">Olá, {affiliate.name}.</h1>
            <p className="mt-2 text-sm text-zinc-500">Análise de {periodLabel(selectedMonth)}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">Selecionar mês</span>
              <select
                value={selectedMonth}
                onChange={async e => {
                  const month = e.target.value
                  setSelectedMonth(month)
                  setSyncMessage('')
                  await load({ month })
                }}
                className="appearance-none rounded-xl border border-pink-100 bg-white py-2.5 pl-4 pr-10 text-sm font-bold text-zinc-800 shadow-sm outline-none transition focus:border-pink-300"
              >
                <option value="all">Todos os meses</option>
                {months.slice().sort().reverse().map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400">⌄</span>
            </label>
            {syncMessage && <span className="text-xs font-semibold text-zinc-400">{syncMessage}</span>}
            <button onClick={() => load({ sync: true })} disabled={syncing} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60">
              {syncing ? 'Atualizando…' : 'Atualizar vendas'}
            </button>
            <Link to={`/${affiliate.slug}`} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm border border-zinc-200">Ver página</Link>
            <button onClick={logout} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white">Sair</button>
          </div>
        </header>

        {Number(dashboard?.lifetimeSales || 0) === 0 && (
          <section className="mt-7 rounded-[1.5rem] border border-pink-100 bg-white p-4 shadow-sm md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">Código de Equipe</p>
                {team.joined ? (
                  <p className="mt-1 text-sm font-bold text-zinc-800">Você está na equipe de <span className="font-black">{team.parent?.name || 'outra afiliada'}</span>.</p>
                ) : (
                  <p className="mt-1 text-xs text-zinc-400">Entre em uma equipe e suba para Bronze no primeiro mês. Informe o código de equipe antes da primeira venda.</p>
                )}
              </div>
              {!team.joined && team.canJoin && (
                <form onSubmit={joinTeam} className="flex w-full gap-2 sm:w-auto">
                  <input value={teamCode} onChange={e => setTeamCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase())} maxLength={6} disabled={teamJoinBusy} placeholder="Código de 6 caracteres" className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-bold uppercase outline-none focus:border-pink-400 sm:w-48" />
                  <button disabled={teamJoinBusy || teamCode.length !== 6} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{teamJoinBusy ? 'Entrando…' : 'Entrar na equipe'}</button>
                </form>
              )}
            </div>
            {teamJoinMessage && <p className="mt-2 text-xs font-semibold text-zinc-500">{teamJoinMessage}</p>}
          </section>
        )}

        <section className={`relative mt-7 overflow-hidden rounded-[2rem] border border-white bg-gradient-to-r ${levelTone(level.key)} p-5 shadow-sm md:p-7`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-400">Seu nível no mês</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className={`text-3xl font-black ${levelAccent(level.key)}`}>{level.label}</h2>
                <span className="text-sm font-bold text-zinc-600">{level.sales} pontos</span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-zinc-800">{brl(level.commissionPerOrder)} / pedido</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {level.nextLevel
                  ? `Faltam ${level.salesToNext} ponto(s) para ${level.nextLevel}.`
                  : 'Você atingiu o nível máximo deste mês.'}
              </p>
            </div>
            <div className="min-w-[220px] text-right">
              <p className="text-xs font-bold text-zinc-400">PROGRESSO</p>
              <p className="mt-1 text-2xl font-black text-zinc-900">{Math.round(level.progress)}%</p>
            </div>
          </div>

          <div className="relative mx-auto mt-8 h-[92px] w-[82%] max-w-[520px] px-0">
            <div className="absolute left-0 right-0 top-4 h-4 rounded-full bg-black/10">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-400 via-zinc-400 to-amber-400 transition-all duration-700" style={{ width: `${level.progress}%` }} />
            </div>


            {[
              { label: 'Bronze', min: 10, image: '/badge-bronze.svg', rate: brl(config.commissions?.bronze), tone: 'text-[#9a5a22]' },
              { label: 'Prata', min: 50, image: '/badge-silver.svg', rate: brl(config.commissions?.silver), tone: 'text-zinc-500' },
              { label: 'Ouro', min: 101, image: '/badge-gold.svg', rate: brl(config.commissions?.gold), tone: 'text-amber-600' },
            ].map(item => {
              const markerLeft = item.label === 'Bronze' ? '10%' : item.label === 'Prata' ? '50%' : '90%'
              return (
                <div key={item.label} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: markerLeft }}>
                  <div className="mx-auto h-10 w-10 rounded-full border-2 border-white bg-white shadow-[0_5px_14px_rgba(0,0,0,.14)] sm:h-12 sm:w-12">
                    <img src={item.image} alt={`Broche ${item.label}`} className="h-full w-full object-contain" />
                  </div>
                  <div className={`mt-1 whitespace-nowrap text-[11px] font-black leading-none sm:text-xs ${item.tone}`}>{item.rate}<span className="ml-0.5 text-[8px] font-bold sm:text-[9px]">/pedido</span></div>
                  <div className="mt-1 text-[8px] font-black uppercase tracking-wider text-zinc-400 sm:text-[9px]">{item.label}</div>
                </div>
              )
            })}
          </div>
          <button type="button" aria-label="Como funcionam os níveis" onClick={() => setLevelHelpOpen(true)} className="absolute bottom-4 right-5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-xs font-black text-zinc-500 shadow-sm transition hover:border-pink-300 hover:text-pink-500">?</button>
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map(([label, value]) => {
            const multiplierActive = label === 'Ticket médio' && dashboard?.metrics?.ticketMultiplierActive
            return (
              <div
                key={label}
                className={`relative rounded-[1.5rem] p-5 border shadow-sm transition-all ${
                  multiplierActive
                    ? 'border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-white shadow-[0_0_35px_rgba(245,158,11,.28)]'
                    : 'border-pink-100 bg-white'
                }`}
              >
                <p className={`text-xs uppercase tracking-[.18em] ${multiplierActive ? 'text-amber-700' : 'text-zinc-400'}`}>{label}</p>
                <p className={`mt-3 text-2xl font-black ${multiplierActive ? 'text-amber-900' : 'text-zinc-950'}`}>{value}</p>
                {multiplierActive && (
                  <span className="mt-2 inline-flex rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-black text-amber-800">+ {brl(dashboard?.metrics?.ticketMultiplierValue ?? config.ticketBonus)} / pedido</span>
                )}
                {label === 'Ticket médio' && (
                  <p className={`mt-2 text-[10px] leading-4 ${multiplierActive ? 'text-amber-700' : 'text-zinc-400'}`}>
                    Ticket acima de {brl(dashboard?.metrics?.ticketMultiplierThreshold ?? config.ticketThreshold)} ativa + {brl(dashboard?.metrics?.ticketMultiplierValue ?? config.ticketBonus)} por pedido no mês. Se cair para {brl(dashboard?.metrics?.ticketMultiplierThreshold ?? config.ticketThreshold)} ou menos, o benefício é perdido até voltar a superar a meta.
                  </p>
                )}
              </div>
            )
          })}
        </section>

        <section className="mt-6 grid items-start gap-6 lg:grid-cols-[520px_380px]">
          <div className="self-start w-full max-w-[520px] rounded-[1.5rem] bg-white p-5 border border-pink-100 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-black text-xl">{selectedMonth === 'all' ? 'Desempenho mensal' : 'Desempenho diário'}</h2>
                <p className="mt-1 text-sm text-zinc-400">{selectedMonth === 'all' ? 'Resultados por mês em todo o período' : `Faturamento por dia em ${monthLabel(selectedMonth)}`}</p>
              </div>
              <div className="hidden sm:block text-right text-xs text-zinc-400">{selectedMonth === 'all' ? 'Evolução mês a mês' : 'Arraste para ver os dias anteriores'}</div>
            </div>

            <div ref={chartScrollRef} className={`mt-4 h-[155px] w-full ${selectedMonth === 'all' ? 'max-w-full overflow-x-auto' : 'max-w-[300px] overflow-x-auto'} overflow-y-hidden rounded-xl bg-white pb-2 overscroll-x-contain scroll-smooth`}>
              <div className={`h-[135px] ${selectedMonth === 'all' ? 'w-full min-w-[520px]' : 'w-max'} px-1`}>
                <div className="flex h-[118px] items-end gap-1 border-b border-zinc-100">
                  {chart.map((item) => {
                    const revenue = Number(item.revenue || 0)
                    const height = revenue ? Math.max(8, (revenue / maxRevenue) * 100) : 3
                    return (
                      <div key={item.date} data-chart-index={chart.indexOf(item)} className={`group flex h-full ${selectedMonth === 'all' ? 'min-w-[72px] flex-1' : 'w-[48px] shrink-0'} flex-col justify-end`}>
                        <div className="relative flex flex-1 items-end justify-center">
                          {revenue > 0 && (
                            <span className="absolute bottom-[calc(var(--bar-height)+5px)] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-zinc-700" style={{ '--bar-height': `${height}%` }}>
                              {brl(revenue).replace('R$ ', 'R$')}
                            </span>
                          )}
                          <div
                            title={`${selectedMonth === 'all' ? (item.label || monthLabel(item.date)) : shortDate(item.date)} — ${brl(revenue)} — ${item.sales} venda(s)`}
                            className="w-[18px] rounded-t-md bg-pink-400 transition-all duration-300 group-hover:bg-pink-500"
                            style={{ height: `${height}%`, minHeight: revenue ? undefined : '3px' }}
                          />
                        </div>
                        <span className="mt-2 text-center text-[8px] font-bold text-zinc-400">{selectedMonth === 'all' ? (item.label || monthLabel(item.date)) : shortDate(item.date)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-zinc-400 sm:hidden">{selectedMonth === 'all' ? 'Deslize para ver os meses anteriores' : 'Deslize para a esquerda para ver os dias anteriores'}</p>
          </div>

          <div className="space-y-6">
            <div className="rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm">
              <h2 className="font-black text-xl">Solicitar saque</h2>
              <p className="mt-2 text-sm text-zinc-500">Disponível para saque: <strong className="text-zinc-900">{brl(availableCommission)}</strong></p>
              <form onSubmit={requestWithdraw} className="mt-5">
                <input
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 100"
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3.5 text-lg font-bold outline-none focus:border-pink-400"
                />
                <button disabled={withdrawBusy} className="mt-3 w-full rounded-2xl bg-zinc-950 py-4 text-base font-black text-white transition hover:bg-pink-500 disabled:opacity-60">
                  {withdrawBusy ? 'Enviando…' : 'Solicitar saque'}
                </button>
              </form>
              <p className="mt-3 text-xs leading-5 text-zinc-400">Saque mínimo de R$ 100,00. Os pedidos devem ser feitos em múltiplos de R$ 100,00.</p>
              {withdrawMessage && <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">{withdrawMessage}</p>}
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm">
              <h2 className="font-black text-xl">PIX de recebimento</h2>
              <p className="mt-2 text-sm text-zinc-500">Cadastre a chave PIX onde você quer receber seus saques.</p>
              {pixKey ? (
                <div className="mt-4 rounded-2xl bg-zinc-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">PIX cadastrado</p>
                  <p className="mt-1 break-all text-sm font-bold text-zinc-900">{pixKey}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
                  Cadastre seu PIX antes de solicitar um saque.
                </div>
              )}
              <button
                type="button"
                onClick={() => { setPixOpen(value => !value); setPixMessage('') }}
                className="mt-3 w-full rounded-2xl bg-pink-500 py-3.5 font-black text-white transition hover:bg-pink-600"
              >
                {pixOpen ? 'Fechar' : (pixKey ? 'Alterar PIX de recebimento' : 'Cadastrar PIX de recebimento')}
              </button>
              {pixOpen && (
                <form onSubmit={savePix} className="mt-4 border-t border-zinc-100 pt-4">
                  <label className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Nova chave PIX</label>
                  <input
                    value={pixKey}
                    onChange={e => setPixKey(e.target.value)}
                    required
                    maxLength={255}
                    autoComplete="off"
                    placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                    className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3.5 text-sm outline-none focus:border-pink-400"
                  />
                  <button disabled={pixBusy} className="mt-3 w-full rounded-2xl bg-zinc-950 py-3.5 font-black text-white disabled:opacity-60">
                    {pixBusy ? 'Salvando…' : 'Salvar PIX'}
                  </button>
                </form>
              )}
              {pixMessage && <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold leading-5 text-zinc-600">{pixMessage}</p>}
            </div>

            <div className="rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm">
              <h2 className="font-black text-xl">Seu link</h2>
              <p className="mt-2 text-sm text-zinc-500">Compartilhe sua página exclusiva.</p>
              <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm font-semibold break-all">{publicUrl}</div>
              <button onClick={() => navigator.clipboard?.writeText(publicUrl)} className="mt-3 w-full rounded-xl bg-pink-500 py-3 font-bold text-white">Copiar link</button>
              <img src={qrUrl} alt="QR Code da afiliada" className="mx-auto mt-5 h-44 w-44 rounded-xl border border-zinc-100 p-2" />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Equipe</p>
              <h2 className="mt-1 text-2xl font-black text-zinc-950">Sua rede</h2>
              <p className="mt-1 text-sm text-zinc-500">Passe seu código para novas afiliadas entrarem diretamente na sua equipe.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2"><span className="text-xs font-bold text-zinc-500">Seu código</span><span className="text-lg font-black tracking-[.18em] text-pink-600">{team.code}</span></div>
            </div>
            <div className="rounded-2xl bg-zinc-50 px-4 py-3 sm:min-w-[220px]">
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Comissão de equipe</p>
              <p className="mt-1 text-xl font-black text-zinc-950">{brl(team.commissionPerSale)} / venda</p>
              <p className="mt-1 text-xs text-zinc-400">Gerada pelas afiliadas diretamente na sua equipe.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Comissão gerada</p><p className="mt-1 text-2xl font-black text-zinc-950">{brl(team.earnedCommission)}</p></div>
            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-pink-500">Disponível para saque</p><p className="mt-1 text-2xl font-black text-zinc-950">{brl(team.availableCommission)}</p></div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-zinc-100 text-left text-[10px] font-black uppercase tracking-[.14em] text-zinc-400"><th className="pb-3">Afiliada</th><th className="pb-3">ID</th><th className="pb-3">Vendas</th><th className="pb-3">Comissão gerada</th></tr></thead>
              <tbody>{(team.members || []).map(member => <tr key={member.id} className="border-b border-zinc-100 last:border-0"><td className="py-3 font-black">{member.name}</td><td className="py-3 text-zinc-500">{member.id}</td><td className="py-3 font-bold">{member.sales}</td><td className="py-3 font-black text-pink-600">{brl(member.commission)}</td></tr>)}</tbody>
            </table>
            {!team.members?.length && <div className="py-6 text-center text-sm text-zinc-400">Nenhuma afiliada entrou na sua equipe ainda.</div>}
          </div>

          <div className="mt-5 rounded-2xl border border-pink-100 bg-white p-4">
            <p className="text-sm font-black text-zinc-900">Sacar comissão de equipe</p>
            <p className="mt-1 text-xs text-zinc-400">Esse saldo é separado da sua comissão pessoal. Saque mínimo de R$ 100,00, sempre em múltiplos de R$ 100,00.</p>
            <form onSubmit={requestTeamWithdraw} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={teamWithdrawAmount} onChange={e => setTeamWithdrawAmount(e.target.value)} inputMode="decimal" placeholder="Ex.: 100" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 font-bold outline-none focus:border-pink-400" />
              <button disabled={teamWithdrawBusy || team.availableCommission < 100} className="rounded-xl bg-pink-500 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{teamWithdrawBusy ? 'Enviando…' : 'Solicitar saque de equipe'}</button>
            </form>
            {teamWithdrawMessage && <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">{teamWithdrawMessage}</p>}
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-white p-6 border border-pink-100 overflow-x-auto shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Pedidos atribuídos</h2>
              <p className="mt-1 text-sm text-zinc-400">Pedidos aprovados em {periodLabel(selectedMonth)}</p>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-500">{dashboard?.metrics?.sales || 0} venda(s)</span>
          </div>
          <table className="mt-5 w-full min-w-[700px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-zinc-400"><th className="pb-3">Pedido</th><th className="pb-3">Status</th><th className="pb-3">Valor</th><th className="pb-3">Comissão</th><th className="pb-3">Data</th></tr></thead>
            <tbody>
              {(dashboard?.orders || []).map(order => (
                <tr key={order.yampi_order_id} className="border-t border-zinc-100">
                  <td className="py-3 font-semibold">{order.yampi_order_id}</td>
                  <td className="py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Pagamento aprovado</span></td>
                  <td className="py-3">{brl(order.total)}</td>
                  <td className="py-3 font-bold">{brl(order.commission)}</td>
                  <td className="py-3">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!dashboard?.orders?.length && <div className="py-10 text-center text-sm text-zinc-400">Nenhuma venda aprovada neste mês.</div>}
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Movimentações de saldo</h2>
              <p className="mt-1 text-sm text-zinc-400">{selectedMonth === 'all' ? 'Solicitações de saque de todo o período.' : 'Solicitações de saque do mês selecionado.'}</p>
            </div>
            <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-500">{(dashboard?.withdrawals || []).length} solicitação(ões)</span>
          </div>

          <div className="mt-5 space-y-3">
            {(dashboard?.withdrawals || []).map(withdrawal => (
              <div key={withdrawal.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">↗</div>
                  <div>
                    <p className="font-black text-zinc-900">Solicitação de Saque {withdrawal.source === 'team' ? '· Equipe' : '· Pessoal'}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{new Date(withdrawal.requested_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-lg font-black text-zinc-950">{brl(withdrawal.amount)}</span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${withdrawal.status === 'pending' ? 'bg-amber-100 text-amber-800' : withdrawal.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-700'}`}>
                    {withdrawalStatusLabel(withdrawal.status)}
                  </span>
                </div>
              </div>
            ))}
            {!dashboard?.withdrawals?.length && (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">Nenhuma solicitação de saque neste mês.</div>
            )}
          </div>
        </section>
      </div>

      {levelHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 py-8 backdrop-blur-[2px]" onMouseDown={() => setLevelHelpOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="level-help-title" className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.22)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Como funcionam os níveis</p>
                <h3 id="level-help-title" className="mt-1 text-xl font-black text-zinc-950">Pontos e retroatividade</h3>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setLevelHelpOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-black text-zinc-500 transition hover:bg-pink-50 hover:text-pink-500">×</button>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-600">
              <p>Os pontos do mês são a soma das suas vendas com as vendas das afiliadas diretamente na sua equipe. O nível reinicia no primeiro dia de cada mês.</p>
              <p>Os níveis atingidos são retroativos às vendas do mês: ao alcançar um novo nível, o valor por pedido daquele nível é aplicado às vendas realizadas no mês.</p>
            </div>
            <button type="button" onClick={() => setLevelHelpOpen(false)} className="mt-6 w-full rounded-xl bg-zinc-950 py-3 font-black text-white transition hover:bg-pink-500">Entendi</button>
          </div>
        </div>
      )}
    </main>
  )
}

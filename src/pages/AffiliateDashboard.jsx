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
  const [form, setForm] = useState({ name: '', slug: '', email: '', password: '' })
  const [login, setLogin] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawBusy, setWithdrawBusy] = useState(false)
  const [withdrawMessage, setWithdrawMessage] = useState('')
  const chartScrollRef = useRef(null)

  useEffect(() => {
    const node = chartScrollRef.current
    if (!node) return
    requestAnimationFrame(() => {
      node.scrollLeft = node.scrollWidth
    })
  }, [selectedMonth, dashboard?.chart?.length])

  const load = async ({ sync = false, month = selectedMonth } = {}) => {
    try {
      const query = month ? `?month=${encodeURIComponent(month)}` : ''
      const data = await api(`/api/affiliate/dashboard${query}`)
      setAffiliate(data.affiliate)
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
        body: JSON.stringify({ amount }),
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

  const cards = useMemo(() => {
    const m = dashboard?.metrics || {}
    return [
      ['Acessos', m.accesses || 0],
      ['Vendas', m.sales || 0],
      ['Faturamento', brl(m.revenue)],
      ['Ticket médio', brl(m.averageTicket)],
      ['Comissão do mês', brl(m.commission)],
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
  const level = dashboard?.level || { key: 'none', label: 'Início', sales: 0, commissionPerOrder: 30, progress: 0, nextLevel: 'Bronze', nextMinSales: 10, salesToNext: 10 }
  const months = dashboard?.months?.length ? dashboard.months : [selectedMonth]
  const availableCommission = Number(dashboard?.metrics?.availableCommission || 0)

  return (
    <main className="min-h-screen bg-[#fffafc] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-pink-500">She Afiliadas</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-zinc-950">Olá, {affiliate.name}.</h1>
            <p className="mt-2 text-sm text-zinc-500">Análise de {monthLabel(selectedMonth)}</p>
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
                {months.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}
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

        <section className={`mt-7 overflow-hidden rounded-[2rem] border border-white bg-gradient-to-r ${levelTone(level.key)} p-5 shadow-sm md:p-7`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-400">Seu nível no mês</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className={`text-3xl font-black ${levelAccent(level.key)}`}>{level.label}</h2>
                <span className="text-sm font-bold text-zinc-600">{level.sales} vendas</span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-zinc-800">{brl(level.commissionPerOrder)} / pedido</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {level.nextLevel
                  ? `Faltam ${level.salesToNext} venda(s) para ${level.nextLevel}.`
                  : 'Você atingiu o nível máximo deste mês.'}
              </p>
            </div>
            <div className="min-w-[220px] text-right">
              <p className="text-xs font-bold text-zinc-400">PROGRESSO</p>
              <p className="mt-1 text-2xl font-black text-zinc-900">{Math.round(level.progress)}%</p>
            </div>
          </div>

          <div className="relative mx-auto mt-8 h-[92px] w-[90%] px-0">
            <div className="absolute left-0 right-0 top-4 h-4 rounded-full bg-black/10">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-400 via-zinc-400 to-amber-400 transition-all duration-700" style={{ width: `${level.progress}%` }} />
            </div>


            {[
              { label: 'Bronze', min: 10, image: '/badge-bronze.svg', rate: 'R$ 40,00', tone: 'text-[#9a5a22]' },
              { label: 'Prata', min: 50, image: '/badge-silver.svg', rate: 'R$ 50,00', tone: 'text-zinc-500' },
              { label: 'Ouro', min: 101, image: '/badge-gold.svg', rate: 'R$ 60,00', tone: 'text-amber-600' },
            ].map(item => {
              const markerLeft = item.label === 'Bronze' ? '10%' : item.label === 'Prata' ? '50%' : '100%'
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
                  <span className="mt-2 inline-flex rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-black text-amber-800">+ R$ 5,00 / venda</span>
                )}
                {label === 'Ticket médio' && (
                  <p className={`mt-2 text-[10px] leading-4 ${multiplierActive ? 'text-amber-700' : 'text-zinc-400'}`}>
                    Ticket acima de R$ 170,00 ativa + R$ 5,00 por venda no mês. Se cair para R$ 170,00 ou menos, o benefício é perdido até voltar a superar a meta.
                  </p>
                )}
              </div>
            )
          })}
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.25rem] border border-pink-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Saldo inicial do mês</p>
            <p className="mt-1 text-xl font-black text-zinc-950">{brl(dashboard?.metrics?.openingBalance)}</p>
            <p className="mt-1 text-xs text-zinc-400">É o saldo final do mês anterior.</p>
          </div>
          <div className="rounded-[1.25rem] border border-pink-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Saldo final do mês</p>
            <p className="mt-1 text-xl font-black text-zinc-950">{brl(dashboard?.metrics?.closingBalance)}</p>
            <p className="mt-1 text-xs text-zinc-400">Já desconta as solicitações de saque deste mês.</p>
          </div>
        </section>

        <section className="mt-6 grid items-start gap-6 lg:grid-cols-[520px_380px]">
          <div className="self-start w-full max-w-[520px] rounded-[1.5rem] bg-white p-5 border border-pink-100 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-black text-xl">Desempenho diário</h2>
                <p className="mt-1 text-sm text-zinc-400">Faturamento por dia em {monthLabel(selectedMonth)}</p>
              </div>
              <div className="hidden sm:block text-right text-xs text-zinc-400">Arraste para ver os dias anteriores</div>
            </div>

            <div ref={chartScrollRef} className="mt-4 h-[155px] w-full max-w-[300px] overflow-x-auto overflow-y-hidden rounded-xl bg-white pb-2 overscroll-x-contain scroll-smooth">
              <div className="h-[135px] w-max px-1">
                <div className="flex h-[118px] items-end gap-1 border-b border-zinc-100">
                  {chart.map((item) => {
                    const revenue = Number(item.revenue || 0)
                    const height = revenue ? Math.max(8, (revenue / maxRevenue) * 100) : 3
                    return (
                      <div key={item.date} className="group flex h-full w-[48px] shrink-0 flex-col justify-end">
                        <div className="relative flex flex-1 items-end justify-center">
                          {revenue > 0 && (
                            <span className="absolute bottom-[calc(var(--bar-height)+5px)] left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-zinc-700" style={{ '--bar-height': `${height}%` }}>
                              {brl(revenue).replace('R$ ', 'R$')}
                            </span>
                          )}
                          <div
                            title={`${shortDate(item.date)} — ${brl(revenue)} — ${item.sales} venda(s)`}
                            className="w-[18px] rounded-t-md bg-pink-400 transition-all duration-300 group-hover:bg-pink-500"
                            style={{ height: `${height}%`, minHeight: revenue ? undefined : '3px' }}
                          />
                        </div>
                        <span className="mt-2 text-center text-[8px] font-bold text-zinc-400">{shortDate(item.date)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-zinc-400 sm:hidden">Deslize para a esquerda para ver os dias anteriores</p>
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
              <h2 className="font-black text-xl">Seu link</h2>
              <p className="mt-2 text-sm text-zinc-500">Compartilhe sua página exclusiva.</p>
              <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm font-semibold break-all">{publicUrl}</div>
              <button onClick={() => navigator.clipboard?.writeText(publicUrl)} className="mt-3 w-full rounded-xl bg-pink-500 py-3 font-bold text-white">Copiar link</button>
              <img src={qrUrl} alt="QR Code da afiliada" className="mx-auto mt-5 h-44 w-44 rounded-xl border border-zinc-100 p-2" />
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-white p-6 border border-pink-100 overflow-x-auto shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Pedidos atribuídos</h2>
              <p className="mt-1 text-sm text-zinc-400">Pedidos aprovados em {monthLabel(selectedMonth)}</p>
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
              <p className="mt-1 text-sm text-zinc-400">Solicitações de saque do mês selecionado.</p>
            </div>
            <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-500">{(dashboard?.withdrawals || []).length} solicitação(ões)</span>
          </div>

          <div className="mt-5 space-y-3">
            {(dashboard?.withdrawals || []).map(withdrawal => (
              <div key={withdrawal.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 text-pink-600">↗</div>
                  <div>
                    <p className="font-black text-zinc-900">Solicitação de Saque</p>
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
    </main>
  )
}

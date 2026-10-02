import { useEffect, useMemo, useState } from 'react'

function brl(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
}

function dateTime(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function withdrawalLabel(status) {
  if (status === 'paid') return 'Pago'
  if (status === 'approved') return 'Aprovado'
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

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [login, setLogin] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [affiliates, setAffiliates] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [refreshing, setRefreshing] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [message, setMessage] = useState('')

  const loadPanel = async () => {
    const [affiliateData, withdrawalData] = await Promise.all([
      api('/api/admin/affiliates'),
      api('/api/admin/withdrawals'),
    ])
    setAffiliates(affiliateData.affiliates || [])
    setWithdrawals(withdrawalData.withdrawals || [])
    setAuthenticated(true)
  }

  useEffect(() => {
    loadPanel()
      .catch(() => setAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  const submitLogin = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify(login),
      })
      await loadPanel()
    } catch (e) {
      setError(e.message || 'Login inválido.')
    } finally {
      setBusy(false)
    }
  }

  const refresh = async () => {
    setRefreshing(true)
    setMessage('')
    try {
      await loadPanel()
      setMessage('Dados atualizados.')
    } catch (e) {
      setMessage(e.message || 'Não foi possível atualizar.')
    } finally {
      setRefreshing(false)
    }
  }

  const logout = async () => {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ action: 'logout' }),
    }).catch(() => {})
    setAuthenticated(false)
    setAffiliates([])
    setWithdrawals([])
  }

  const markPaid = async (withdrawal) => {
    if (!window.confirm(`Confirmar que o saque de ${brl(withdrawal.amount)} da afiliada ${withdrawal.affiliates?.name || '—'} já foi pago?`)) return

    setPayingId(withdrawal.id)
    setMessage('')
    try {
      await api('/api/admin/withdrawals', {
        method: 'PATCH',
        body: JSON.stringify({ id: withdrawal.id }),
      })
      await loadPanel()
      setMessage('Saque marcado como pago. O painel da afiliada já poderá mostrar o novo status.')
    } catch (e) {
      setMessage(e.message || 'Não foi possível marcar o saque como pago.')
    } finally {
      setPayingId(null)
    }
  }

  const stats = useMemo(() => {
    const totalSales = affiliates.reduce((sum, affiliate) => sum + Number(affiliate.sales || 0), 0)
    const totalBalance = affiliates.reduce((sum, affiliate) => sum + Number(affiliate.balance || 0), 0)
    const pending = withdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
    const pendingAmount = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      affiliates: affiliates.length,
      totalSales,
      totalBalance,
      pendingCount: pending.length,
      pendingAmount,
    }
  }, [affiliates, withdrawals])

  const orderedWithdrawals = useMemo(() => {
    const priority = { pending: 0, approved: 1, paid: 2, rejected: 3, cancelled: 4 }
    return [...withdrawals].sort((a, b) => {
      const pa = priority[a.status] ?? 9
      const pb = priority[b.status] ?? 9
      if (pa !== pb) return pa - pb
      return new Date(b.requested_at || 0) - new Date(a.requested_at || 0)
    })
  }, [withdrawals])

  if (loading) return <main className="min-h-screen bg-[#fffafc]" />

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-[#fffafc] flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-pink-100 bg-white p-8 shadow-[0_30px_100px_rgba(0,0,0,.10)]">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[.28em] text-pink-500">She</p>
            <h1 className="mt-2 text-3xl font-black text-zinc-950">Painel administrativo</h1>
            <p className="mt-2 text-sm text-zinc-500">Acesso restrito ao administrador.</p>
          </div>

          <form onSubmit={submitLogin} className="mt-7 space-y-3">
            <input
              value={login.username}
              onChange={event => setLogin(current => ({ ...current, username: event.target.value }))}
              autoComplete="username"
              required
              placeholder="Login"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-pink-400"
            />
            <input
              value={login.password}
              onChange={event => setLogin(current => ({ ...current, password: event.target.value }))}
              type="password"
              autoComplete="current-password"
              required
              placeholder="Senha"
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3.5 outline-none transition focus:border-pink-400"
            />
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{error}</p>}
            <button disabled={busy} className="w-full rounded-2xl bg-zinc-950 py-3.5 font-black text-white transition hover:bg-pink-500 disabled:opacity-60">
              {busy ? 'Entrando…' : 'Entrar no painel'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffafc] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.28em] text-pink-500">She Afiliadas</p>
            <h1 className="mt-1 text-3xl font-black text-zinc-950 md:text-4xl">Painel administrativo</h1>
            <p className="mt-1 text-sm text-zinc-500">Visão geral das afiliadas e pagamentos de saque.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {message && <span className="text-xs font-semibold text-zinc-500">{message}</span>}
            <button onClick={refresh} disabled={refreshing} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">
              {refreshing ? 'Atualizando…' : 'Atualizar'}
            </button>
            <button onClick={logout} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white">Sair</button>
          </div>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Afiliadas', stats.affiliates],
            ['Vendas acumuladas', stats.totalSales],
            ['Saldo das afiliadas', brl(stats.totalBalance)],
            ['Saques pendentes', `${stats.pendingCount} · ${brl(stats.pendingAmount)}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Afiliadas cadastradas</h2>
              <p className="mt-1 text-sm text-zinc-400">Vendas e ticket médio considerando todo o histórico registrado no SQL.</p>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-500">{affiliates.length} cadastrada(s)</span>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">
                  <th className="pb-3 pr-4">Afiliada</th>
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Vendas</th>
                  <th className="pb-3 pr-4">Ticket médio</th>
                  <th className="pb-3 pr-4">Saldo</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map(affiliate => (
                  <tr key={affiliate.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-black text-zinc-950">{affiliate.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-400">/{affiliate.slug}</div>
                    </td>
                    <td className="py-4 pr-4 font-bold text-zinc-600">{affiliate.id}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{affiliate.sales}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{brl(affiliate.averageTicket)}</td>
                    <td className="py-4 pr-4 font-black text-emerald-600">{brl(affiliate.balance)}</td>
                    <td className="py-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${affiliate.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {affiliate.active ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!affiliates.length && <div className="py-10 text-center text-sm text-zinc-400">Nenhuma afiliada cadastrada.</div>}
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Solicitações de saque</h2>
              <p className="mt-1 text-sm text-zinc-400">Pague a afiliada primeiro. Depois clique em “Marcar como pago”.</p>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{stats.pendingCount} aguardando pagamento</span>
          </div>

          <div className="mt-5 space-y-3">
            {orderedWithdrawals.map(withdrawal => {
              const pending = withdrawal.status === 'pending' || withdrawal.status === 'approved'
              return (
                <div key={withdrawal.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-zinc-950">{withdrawal.affiliates?.name || 'Afiliada'}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-zinc-500">ID {withdrawal.affiliate_id}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${withdrawal.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : pending ? 'bg-amber-100 text-amber-800' : 'bg-zinc-200 text-zinc-600'}`}>
                        {withdrawalLabel(withdrawal.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">Solicitado em {dateTime(withdrawal.requested_at)} · Saque #{withdrawal.id}</p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <span className="text-xl font-black text-zinc-950">{brl(withdrawal.amount)}</span>
                    {pending && (
                      <button
                        onClick={() => markPaid(withdrawal)}
                        disabled={payingId === withdrawal.id}
                        className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {payingId === withdrawal.id ? 'Salvando…' : 'Marcar como pago'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {!orderedWithdrawals.length && (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">Nenhuma solicitação de saque registrada.</div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

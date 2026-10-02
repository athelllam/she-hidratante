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

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-black transition ${active ? 'bg-zinc-950 text-white shadow-sm' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
    >
      {children}
    </button>
  )
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
  const [togglingId, setTogglingId] = useState(null)
  const [message, setMessage] = useState('')
  const [affiliateFilter, setAffiliateFilter] = useState('all')
  const [withdrawalFilter, setWithdrawalFilter] = useState('all')
  const [credentialsAffiliate, setCredentialsAffiliate] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleteAffiliate, setDeleteAffiliate] = useState(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deletingId, setDeletingId] = useState(null)

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

  const toggleAdminStatus = async (affiliate) => {
    const next = !Boolean(affiliate.adminActive)
    setTogglingId(affiliate.id)
    setMessage('')
    try {
      await api('/api/admin/affiliates', {
        method: 'PATCH',
        body: JSON.stringify({ id: affiliate.id, adminActive: next }),
      })
      setAffiliates(current => current.map(item => item.id === affiliate.id ? { ...item, adminActive: next, adminActiveSource: 'manual' } : item))
      setMessage(`${affiliate.name}: status administrativo ${next ? 'ATIVA' : 'INATIVA'}.`)
    } catch (e) {
      setMessage(e.message || 'Não foi possível alterar o status.')
    } finally {
      setTogglingId(null)
    }
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

  const openDeleteConfirmation = (affiliate) => {
    const confirmed = window.confirm(
      `ATENÇÃO: você está prestes a excluir permanentemente a afiliada ${affiliate.name}.\n\nIsso apagará a conta de acesso, o cadastro SQL, eventos, pedidos, comissões e saques vinculados. Essa ação NÃO pode ser desfeita.\n\nDeseja continuar para a confirmação final?`
    )
    if (!confirmed) return
    setDeleteAffiliate(affiliate)
    setDeleteConfirmation('')
    setDeletePhrase('')
  }

  const permanentlyDeleteAffiliate = async (event) => {
    event.preventDefault()
    if (!deleteAffiliate) return
    if (deleteConfirmation.trim() !== deleteAffiliate.name.trim() || deletePhrase !== 'EXCLUIR') return

    setDeletingId(deleteAffiliate.id)
    setMessage('')
    try {
      await api('/api/admin/affiliates', {
        method: 'DELETE',
        body: JSON.stringify({
          id: deleteAffiliate.id,
          confirmName: deleteConfirmation.trim(),
          confirmPhrase: deletePhrase,
        }),
      })
      setAffiliates(current => current.filter(item => item.id !== deleteAffiliate.id))
      setDeleteAffiliate(null)
      setDeleteConfirmation('')
      setDeletePhrase('')
      setMessage(`Afiliada ${deleteAffiliate.name} excluída completamente do sistema.`)
    } catch (e) {
      setMessage(e.message || 'Não foi possível excluir a afiliada.')
    } finally {
      setDeletingId(null)
    }
  }

  const saveNewPassword = async (event) => {
    event.preventDefault()
    if (!credentialsAffiliate || newPassword.length < 8) return
    setSavingPassword(true)
    setMessage('')
    try {
      await api('/api/admin/affiliates', {
        method: 'PATCH',
        body: JSON.stringify({ id: credentialsAffiliate.id, password: newPassword }),
      })
      setNewPassword('')
      setCredentialsAffiliate(current => current ? { ...current, passwordUpdatedAt: new Date().toISOString() } : current)
      setMessage(`Senha da afiliada ${credentialsAffiliate.name} redefinida com sucesso.`)
    } catch (e) {
      setMessage(e.message || 'Não foi possível redefinir a senha.')
    } finally {
      setSavingPassword(false)
    }
  }

  const stats = useMemo(() => {
    const totalSales = affiliates.reduce((sum, affiliate) => sum + Number(affiliate.sales || 0), 0)
    const totalBalance = affiliates.reduce((sum, affiliate) => sum + Number(affiliate.balance || 0), 0)
    const pending = withdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
    const pendingAmount = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      affiliates: affiliates.length,
      active: affiliates.filter(item => item.adminActive).length,
      inactive: affiliates.filter(item => !item.adminActive).length,
      totalSales,
      totalBalance,
      pendingCount: pending.length,
      pendingAmount,
    }
  }, [affiliates, withdrawals])

  const filteredAffiliates = useMemo(() => {
    if (affiliateFilter === 'active') return affiliates.filter(item => item.adminActive)
    if (affiliateFilter === 'inactive') return affiliates.filter(item => !item.adminActive)
    return affiliates
  }, [affiliates, affiliateFilter])

  const filteredWithdrawals = useMemo(() => {
    if (withdrawalFilter === 'pending') return withdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
    if (withdrawalFilter === 'paid') return withdrawals.filter(item => item.status === 'paid')
    return withdrawals
  }, [withdrawals, withdrawalFilter])

  const orderedWithdrawals = useMemo(() => {
    const priority = { pending: 0, approved: 1, paid: 2, rejected: 3, cancelled: 4 }
    return [...filteredWithdrawals].sort((a, b) => {
      const pa = priority[a.status] ?? 9
      const pb = priority[b.status] ?? 9
      if (pa !== pb) return pa - pb
      return new Date(b.requested_at || 0) - new Date(a.requested_at || 0)
    })
  }, [filteredWithdrawals])

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

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ['Afiliadas', stats.affiliates],
            ['Ativas', stats.active],
            ['Inativas', stats.inactive],
            ['Vendas acumuladas', stats.totalSales],
            ['Saldo das afiliadas', brl(stats.totalBalance)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Afiliadas cadastradas</h2>
              <p className="mt-1 text-sm text-zinc-400">Vendas e ticket médio considerando todo o histórico registrado no SQL.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill active={affiliateFilter === 'all'} onClick={() => setAffiliateFilter('all')}>Todas · {stats.affiliates}</FilterPill>
              <FilterPill active={affiliateFilter === 'active'} onClick={() => setAffiliateFilter('active')}>Ativas · {stats.active}</FilterPill>
              <FilterPill active={affiliateFilter === 'inactive'} onClick={() => setAffiliateFilter('inactive')}>Inativas · {stats.inactive}</FilterPill>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">
                  <th className="pb-3 pr-4">Afiliada</th>
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Vendas</th>
                  <th className="pb-3 pr-4">Ticket médio</th>
                  <th className="pb-3 pr-4">Saldo</th>
                  <th className="pb-3 pr-4">Ativa/Inativa</th>
                  <th className="pb-3 pr-4">Dados de acesso</th>
                  <th className="pb-3">Excluir</th>
                </tr>
              </thead>
              <tbody>
                {filteredAffiliates.map(affiliate => (
                  <tr key={affiliate.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="font-black text-zinc-950">{affiliate.name}</div>
                      <div className="mt-0.5 text-xs text-zinc-400">/{affiliate.slug}</div>
                      {affiliate.lastSaleAt ? (
                        <div className="mt-1 text-[10px] text-zinc-400">Última venda: {dateTime(affiliate.lastSaleAt)}</div>
                      ) : (
                        <div className="mt-1 text-[10px] text-amber-600">Ainda não possui venda</div>
                      )}
                    </td>
                    <td className="py-4 pr-4 font-bold text-zinc-600">{affiliate.id}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{affiliate.sales}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{brl(affiliate.averageTicket)}</td>
                    <td className="py-4 pr-4 font-black text-emerald-600">{brl(affiliate.balance)}</td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => toggleAdminStatus(affiliate)}
                        disabled={togglingId === affiliate.id}
                        aria-label={`Alternar status administrativo de ${affiliate.name}`}
                        className={`relative h-8 w-[58px] rounded-full p-1 transition disabled:opacity-60 ${affiliate.adminActive ? 'bg-emerald-500' : 'bg-zinc-300'}`}
                      >
                        <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${affiliate.adminActive ? 'translate-x-[26px]' : 'translate-x-0'}`} />
                      </button>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`text-[11px] font-black ${affiliate.adminActive ? 'text-emerald-700' : 'text-zinc-500'}`}>
                          {affiliate.adminActive ? 'ATIVA' : 'INATIVA'}
                        </span>
                        {affiliate.autoInactive && <span className="text-[9px] font-bold text-amber-600">7 dias sem venda</span>}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => { setCredentialsAffiliate(affiliate); setNewPassword('') }}
                        className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:border-pink-300 hover:text-pink-600"
                      >
                        Ver dados
                      </button>
                    </td>
                    <td className="py-4">
                      <button
                        type="button"
                        onClick={() => openDeleteConfirmation(affiliate)}
                        disabled={deletingId === affiliate.id}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-50"
                      >
                        {deletingId === affiliate.id ? 'Excluindo…' : 'Excluir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredAffiliates.length && <div className="py-10 text-center text-sm text-zinc-400">Nenhuma afiliada encontrada nesse filtro.</div>}
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Solicitações de saque</h2>
              <p className="mt-1 text-sm text-zinc-400">Pague a afiliada primeiro. Depois clique em “Marcar como pago”.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill active={withdrawalFilter === 'all'} onClick={() => setWithdrawalFilter('all')}>Todos · {withdrawals.length}</FilterPill>
              <FilterPill active={withdrawalFilter === 'pending'} onClick={() => setWithdrawalFilter('pending')}>Pendentes · {stats.pendingCount}</FilterPill>
              <FilterPill active={withdrawalFilter === 'paid'} onClick={() => setWithdrawalFilter('paid')}>Pagos · {withdrawals.filter(item => item.status === 'paid').length}</FilterPill>
            </div>
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
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-10 text-center text-sm text-zinc-400">Nenhuma solicitação encontrada nesse filtro.</div>
            )}
          </div>
        </section>
      </div>

      {deleteAffiliate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-5 py-8" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingId) setDeleteAffiliate(null) }}>
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-red-500">Exclusão permanente</p>
                <h3 className="mt-1 text-2xl font-black text-zinc-950">Excluir {deleteAffiliate.name}?</h3>
              </div>
              <button type="button" disabled={Boolean(deletingId)} onClick={() => setDeleteAffiliate(null)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-500 disabled:opacity-50">×</button>
            </div>

            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-black text-red-800">Esta ação não pode ser desfeita.</p>
              <p className="mt-1 text-xs leading-5 text-red-700">Serão excluídos o cadastro da afiliada, a conta de autenticação e todos os eventos, pedidos, comissões e solicitações de saque relacionados.</p>
            </div>

            <form onSubmit={permanentlyDeleteAffiliate} className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Confirmação 1 de 2</label>
                <p className="mt-1 text-xs text-zinc-500">Digite exatamente o nome da afiliada: <strong className="text-zinc-900">{deleteAffiliate.name}</strong></p>
                <input
                  value={deleteConfirmation}
                  onChange={event => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                  disabled={Boolean(deletingId)}
                  placeholder="Nome da afiliada"
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-red-400 disabled:bg-zinc-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Confirmação 2 de 2</label>
                <p className="mt-1 text-xs text-zinc-500">Digite <strong className="text-red-600">EXCLUIR</strong> para confirmar a exclusão definitiva.</p>
                <input
                  value={deletePhrase}
                  onChange={event => setDeletePhrase(event.target.value.toUpperCase())}
                  autoComplete="off"
                  disabled={Boolean(deletingId)}
                  placeholder="EXCLUIR"
                  className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-black uppercase tracking-[.15em] outline-none focus:border-red-400 disabled:bg-zinc-50"
                />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" disabled={Boolean(deletingId)} onClick={() => setDeleteAffiliate(null)} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-600 disabled:opacity-50">Cancelar</button>
                <button
                  type="submit"
                  disabled={Boolean(deletingId) || deleteConfirmation.trim() !== deleteAffiliate.name.trim() || deletePhrase !== 'EXCLUIR'}
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deletingId ? 'Excluindo definitivamente…' : 'Excluir definitivamente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {credentialsAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-5 py-8" onMouseDown={(event) => { if (event.target === event.currentTarget) setCredentialsAffiliate(null) }}>
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.25)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Dados da afiliada</p>
                <h3 className="mt-1 text-2xl font-black text-zinc-950">{credentialsAffiliate.name}</h3>
              </div>
              <button type="button" onClick={() => setCredentialsAffiliate(null)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-500">×</button>
            </div>

            <div className="mt-6 space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">E-mail</p>
                <p className="mt-1 break-all font-bold text-zinc-900">{credentialsAffiliate.email || '—'}</p>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-amber-600">Senha atual</p>
                <p className="mt-1 text-sm font-bold text-amber-900">Não pode ser visualizada: o Supabase Auth não disponibiliza a senha atual.</p>
              </div>
            </div>

            <form onSubmit={saveNewPassword} className="mt-5 border-t border-zinc-100 pt-5">
              <p className="text-sm font-black text-zinc-900">Definir uma nova senha</p>
              <p className="mt-1 text-xs text-zinc-400">Isso altera a senha usada pela afiliada para entrar no painel.</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  type="password"
                  minLength={8}
                  required
                  placeholder="Nova senha (mín. 8 caracteres)"
                  className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-pink-400"
                />
                <button disabled={savingPassword || newPassword.length < 8} className="rounded-xl bg-zinc-950 px-4 py-3 text-xs font-black text-white disabled:opacity-50">
                  {savingPassword ? 'Salvando…' : 'Redefinir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

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

function whatsappUrl(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return null
  return `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}`
}

function WhatsAppIcon({ value, name }) {
  const href = whatsappUrl(value)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`Falar com ${name || 'afiliada'} pelo WhatsApp`}
      title="Falar pelo WhatsApp"
      className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition hover:scale-105 hover:bg-emerald-600"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M20.5 3.5A11.85 11.85 0 0 0 12.08 0C5.55 0 .23 5.32.23 11.85c0 2.09.55 4.13 1.6 5.93L.14 24l6.36-1.67a11.82 11.82 0 0 0 5.58 1.41h.01c6.53 0 11.84-5.32 11.84-11.85 0-3.16-1.23-6.13-3.43-8.39ZM12.09 21.7h-.01a9.83 9.83 0 0 1-5.01-1.37l-.36-.21-3.77.99 1.01-3.67-.23-.38a9.86 9.86 0 1 1 8.37 4.64Zm5.41-7.39c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.71.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
  )
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
  const [affiliateSearch, setAffiliateSearch] = useState('')
  const [withdrawalFilter, setWithdrawalFilter] = useState('all')
  const [credentialsAffiliate, setCredentialsAffiliate] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [selectedAffiliateIds, setSelectedAffiliateIds] = useState(new Set())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deletingIds, setDeletingIds] = useState([])
  const [settings, setSettings] = useState({ ticketThreshold: 170, commissions: { none: 30, bronze: 40, silver: 50, gold: 60 } })
  const [settingsForm, setSettingsForm] = useState({ ticketThreshold: '170', none: '30', bronze: '40', silver: '50', gold: '60' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [globalStatsData, setGlobalStatsData] = useState({ all: { sales: 0, revenue: 0, averageTicket: 0 }, byMonth: {} })
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [monthFilterOpen, setMonthFilterOpen] = useState(false)

  const loadPanel = async () => {
    const [affiliateData, withdrawalData] = await Promise.all([
      api('/api/admin/affiliates'),
      api('/api/admin/withdrawals'),
    ])
    setAffiliates(affiliateData.affiliates || [])
    setWithdrawals(withdrawalData.withdrawals || [])
    setGlobalStatsData(affiliateData.globalStats || { all: { sales: 0, revenue: 0, averageTicket: 0 }, byMonth: {} })
    setAvailableMonths(affiliateData.availableMonths || [])
    const nextSettings = affiliateData.settings || { ticketThreshold: 170, commissions: { none: 30, bronze: 40, silver: 50, gold: 60 } }
    setSettings(nextSettings)
    setSettingsForm({
      ticketThreshold: String(nextSettings.ticketThreshold),
      none: String(nextSettings.commissions?.none ?? 30),
      bronze: String(nextSettings.commissions?.bronze ?? 40),
      silver: String(nextSettings.commissions?.silver ?? 50),
      gold: String(nextSettings.commissions?.gold ?? 60),
    })
    setSelectedAffiliateIds(new Set())
    setDeleteModalOpen(false)
    setDeletePhrase('')
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
    setSelectedAffiliateIds(new Set())
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

  const toggleAffiliateSelection = (affiliateId) => {
    setSelectedAffiliateIds(current => {
      const next = new Set(current)
      if (next.has(affiliateId)) next.delete(affiliateId)
      else next.add(affiliateId)
      return next
    })
  }

  const openDeleteConfirmation = () => {
    const selected = affiliates.filter(affiliate => selectedAffiliateIds.has(affiliate.id))
    if (!selected.length) return
    const names = selected.map(affiliate => `• ${affiliate.name}`).join('\n')
    const confirmed = window.confirm(
      `ATENÇÃO: você está prestes a excluir permanentemente ${selected.length} afiliada(s).\n\n${names}\n\nIsso apagará as contas de acesso, cadastros SQL, eventos, pedidos, comissões e saques vinculados. Essa ação NÃO pode ser desfeita.\n\nDeseja continuar para a confirmação final?`
    )
    if (!confirmed) return
    setDeletePhrase('')
    setDeleteModalOpen(true)
  }

  const permanentlyDeleteSelected = async (event) => {
    event.preventDefault()
    const ids = Array.from(selectedAffiliateIds)
    if (!ids.length || deletePhrase !== 'EXCLUIR') return

    setDeletingIds(ids)
    setMessage('')
    try {
      await api('/api/admin/affiliates', {
        method: 'DELETE',
        body: JSON.stringify({ ids, confirmCount: ids.length, confirmPhrase: deletePhrase }),
      })
      setAffiliates(current => current.filter(item => !ids.includes(item.id)))
      setSelectedAffiliateIds(new Set())
      setDeleteModalOpen(false)
      setDeletePhrase('')
      setMessage(`${ids.length} afiliada(s) excluída(s) completamente do sistema.`)
    } catch (e) {
      setMessage(e.message || 'Não foi possível excluir as afiliadas selecionadas.')
    } finally {
      setDeletingIds([])
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setSavingSettings(true)
    setMessage('')
    try {
      const payload = {
        ticketThreshold: Number(String(settingsForm.ticketThreshold).replace(',', '.')),
        commissions: {
          none: Number(String(settingsForm.none).replace(',', '.')),
          bronze: Number(String(settingsForm.bronze).replace(',', '.')),
          silver: Number(String(settingsForm.silver).replace(',', '.')),
          gold: Number(String(settingsForm.gold).replace(',', '.')),
        },
      }
      if (!Number.isFinite(payload.ticketThreshold) || payload.ticketThreshold <= 0 || Object.values(payload.commissions).some(value => !Number.isFinite(value) || value < 0)) {
        throw new Error('Informe valores válidos. A meta do ticket deve ser maior que zero e as comissões não podem ser negativas.')
      }
      const result = await api('/api/admin/affiliates', {
        method: 'PATCH',
        body: JSON.stringify({ settings: payload }),
      })
      setSettings(result.settings)
      setSettingsForm({
        ticketThreshold: String(result.settings.ticketThreshold),
        none: String(result.settings.commissions.none),
        bronze: String(result.settings.commissions.bronze),
        silver: String(result.settings.commissions.silver),
        gold: String(result.settings.commissions.gold),
      })
      setMessage('Configurações de comissão e ticket médio atualizadas para todas as afiliadas.')
      await loadPanel()
    } catch (e) {
      setMessage(e.message || 'Não foi possível atualizar as configurações.')
    } finally {
      setSavingSettings(false)
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
    const selected = selectedMonths.length
      ? selectedMonths.reduce((acc, month) => {
          const value = globalStatsData.byMonth?.[month]
          if (!value) return acc
          acc.sales += Number(value.sales || 0)
          acc.revenue += Number(value.revenue || 0)
          return acc
        }, { sales: 0, revenue: 0 })
      : { sales: Number(globalStatsData.all?.sales || 0), revenue: Number(globalStatsData.all?.revenue || 0) }
    selected.averageTicket = selected.sales ? selected.revenue / selected.sales : 0
    const totalBalance = affiliates.reduce((sum, affiliate) => sum + Number(affiliate.balance || 0), 0)
    const pending = withdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
    const pendingAmount = pending.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return {
      affiliates: affiliates.length,
      active: affiliates.filter(item => item.adminActive).length,
      inactive: affiliates.filter(item => !item.adminActive).length,
      totalSales: selected.sales,
      totalRevenue: selected.revenue,
      averageTicket: selected.averageTicket,
      totalBalance,
      pendingCount: pending.length,
      pendingAmount,
    }
  }, [affiliates, withdrawals, globalStatsData, selectedMonths])

  const monthLabel = (month) => {
    const [year, monthNumber] = String(month).split('-')
    return new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  }

  const toggleMonth = (month) => {
    setSelectedMonths(current => current.includes(month) ? current.filter(item => item !== month) : [...current, month])
  }

  const clearMonthFilter = () => setSelectedMonths([])

  const filteredAffiliates = useMemo(() => {
    const query = affiliateSearch.trim().toLocaleLowerCase('pt-BR')
    const filtered = affiliates.filter(item => {
      const matchesStatus = affiliateFilter === 'all'
        ? true
        : affiliateFilter === 'active'
          ? Boolean(item.adminActive)
          : !item.adminActive
      const matchesName = !query || String(item.name || '').toLocaleLowerCase('pt-BR').includes(query)
      return matchesStatus && matchesName
    })

    return [...filtered].sort((a, b) => {
      const salesDifference = Number(b.sales || 0) - Number(a.sales || 0)
      if (salesDifference !== 0) return salesDifference
      return String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
    })
  }, [affiliates, affiliateFilter, affiliateSearch])

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

        <section className="mt-7">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Período dos indicadores globais</p>
              <p className="mt-1 text-sm font-semibold text-zinc-600">{selectedMonths.length ? `${selectedMonths.length} ${selectedMonths.length === 1 ? 'mês selecionado' : 'meses selecionados'}` : 'Todos os meses'}</p>
            </div>
            <div className="relative">
              <button type="button" onClick={() => setMonthFilterOpen(current => !current)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-800 shadow-sm hover:border-pink-300">
                {selectedMonths.length ? 'Alterar meses' : 'Filtrar por mês'} ▾
              </button>
              {monthFilterOpen && (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,.12)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-zinc-950">Selecionar meses</p>
                    <button type="button" onClick={clearMonthFilter} className="text-xs font-bold text-pink-500">Todos</button>
                  </div>
                  <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                    {availableMonths.length ? availableMonths.map(month => (
                      <label key={month} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-zinc-50">
                        <input type="checkbox" checked={selectedMonths.includes(month)} onChange={() => toggleMonth(month)} className="h-4 w-4 accent-pink-500" />
                        <span className="text-sm font-semibold capitalize text-zinc-700">{monthLabel(month)}</span>
                      </label>
                    )) : <p className="text-xs text-zinc-400">Ainda não há vendas pagas registradas.</p>}
                  </div>
                  <button type="button" onClick={() => setMonthFilterOpen(false)} className="mt-3 w-full rounded-xl bg-zinc-950 py-2.5 text-xs font-black text-white">Aplicar</button>
                </div>
              )}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {[
            ['Afiliadas', stats.affiliates],
            ['Ativas', stats.active],
            ['Inativas', stats.inactive],
            ['Vendas acumuladas', stats.totalSales],
            ['Faturamento', brl(stats.totalRevenue)],
            ['Ticket médio', brl(stats.averageTicket)],
            ['Saldo das afiliadas', brl(stats.totalBalance)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
            </div>
          ))}
          </div>
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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
              <input
                value={affiliateSearch}
                onChange={event => setAffiliateSearch(event.target.value)}
                placeholder="Pesquisar afiliada pelo nome"
                type="search"
                className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-9 pr-9 text-sm font-semibold text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-pink-400"
              />
              {affiliateSearch && (
                <button
                  type="button"
                  onClick={() => setAffiliateSearch('')}
                  aria-label="Limpar pesquisa"
                  className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-zinc-400">Ordenado por maior número de vendas</p>
              <button
                type="button"
                onClick={openDeleteConfirmation}
                disabled={!selectedAffiliateIds.size || deletingIds.length > 0}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {selectedAffiliateIds.size ? `Excluir selecionadas (${selectedAffiliateIds.size})` : 'Excluir selecionadas'}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1120px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">
                  <th className="pb-3 pr-4">Afiliada</th>
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Vendas</th>
                  <th className="pb-3 pr-4">Faturamento</th>
                  <th className="pb-3 pr-4">Ticket médio</th>
                  <th className="pb-3 pr-4">Saldo</th>
                  <th className="pb-3 pr-4">Ativa/Inativa</th>
                  <th className="pb-3 pr-4">Dados de acesso</th>
                  <th className="pb-3">Selecionar</th>
                </tr>
              </thead>
              <tbody>
                {filteredAffiliates.map(affiliate => (
                  <tr key={affiliate.id} className="border-b border-zinc-100 last:border-0">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2"><div className="font-black text-zinc-950">{affiliate.name}</div><WhatsAppIcon value={affiliate.whatsapp} name={affiliate.name} /></div>
                      <div className="mt-0.5 text-xs text-zinc-400">/{affiliate.slug}</div>
                      {affiliate.lastSaleAt ? (
                        <div className="mt-1 text-[10px] text-zinc-400">Última venda: {dateTime(affiliate.lastSaleAt)}</div>
                      ) : (
                        <div className="mt-1 text-[10px] text-amber-600">Ainda não possui venda</div>
                      )}
                    </td>
                    <td className="py-4 pr-4 font-bold text-zinc-600">{affiliate.id}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{affiliate.sales}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{brl(affiliate.revenue)}</td>
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
                        role="switch"
                        aria-checked={selectedAffiliateIds.has(affiliate.id)}
                        aria-label={`Selecionar ${affiliate.name} para exclusão`}
                        onClick={() => toggleAffiliateSelection(affiliate.id)}
                        disabled={deletingIds.length > 0}
                        className={`relative h-8 w-[58px] rounded-full p-1 transition disabled:opacity-50 ${selectedAffiliateIds.has(affiliate.id) ? 'bg-red-500' : 'bg-zinc-200'}`}
                      >
                        <span className={`block h-6 w-6 rounded-full bg-white shadow transition-transform ${selectedAffiliateIds.has(affiliate.id) ? 'translate-x-[26px]' : 'translate-x-0'}`} />
                      </button>
                      <div className={`mt-1 text-[10px] font-black ${selectedAffiliateIds.has(affiliate.id) ? 'text-red-600' : 'text-zinc-400'}`}>
                        {selectedAffiliateIds.has(affiliate.id) ? 'SELECIONADA' : 'NÃO SELECIONADA'}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredAffiliates.length && (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-sm font-semibold text-zinc-400">
                      Nenhuma afiliada encontrada{affiliateSearch ? ` para "${affiliateSearch}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-zinc-950">Configurações de comissão</h2>
            <p className="mt-1 text-sm text-zinc-400">Altere a meta de ticket médio e os valores pagos por pedido em cada faixa. A mudança vale para todas as afiliadas.</p>
          </div>

          <form onSubmit={saveSettings} className="mt-5 grid gap-4 md:grid-cols-5">
            <label className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-amber-700">Meta ticket médio</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-black text-zinc-500">R$</span>
                <input value={settingsForm.ticketThreshold} onChange={e => setSettingsForm(v => ({ ...v, ticketThreshold: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-amber-400" />
              </div>
              <p className="mt-2 text-[10px] font-semibold text-amber-700">Acima dessa meta, entra o bônus de +R$ 5,00/pedido.</p>
            </label>

            {[['none', 'Início'], ['bronze', 'Bronze'], ['silver', 'Prata'], ['gold', 'Ouro']].map(([key, label]) => (
              <label key={key} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <span className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-500">{label} · por pedido</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-black text-zinc-500">R$</span>
                  <input value={settingsForm[key]} onChange={e => setSettingsForm(v => ({ ...v, [key]: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-pink-400" />
                </div>
              </label>
            ))}

            <div className="md:col-span-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-400">Atual: meta {brl(settings.ticketThreshold)} · Início {brl(settings.commissions?.none)} · Bronze {brl(settings.commissions?.bronze)} · Prata {brl(settings.commissions?.silver)} · Ouro {brl(settings.commissions?.gold)}</p>
              <button disabled={savingSettings} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500 disabled:opacity-50">{savingSettings ? 'Atualizando…' : 'Atualizar valores'}</button>
            </div>
          </form>
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
                    <p className="mt-1 text-xs font-semibold text-zinc-600">PIX para recebimento: <span className="break-all font-bold text-zinc-900">{withdrawal.pix_key || 'Não informado (saque antigo)'}</span></p>
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

      {deleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-5 py-8" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingIds.length) setDeleteModalOpen(false) }}>
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[.22em] text-red-500">Exclusão permanente</p>
                <h3 className="mt-1 text-2xl font-black text-zinc-950">Excluir {selectedAffiliateIds.size} afiliada(s)?</h3>
              </div>
              <button type="button" disabled={Boolean(deletingIds.length)} onClick={() => setDeleteModalOpen(false)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-500 disabled:opacity-50">×</button>
            </div>

            <div className="mt-5 max-h-40 overflow-y-auto rounded-2xl border border-red-200 bg-red-50 p-4">
              {affiliates.filter(item => selectedAffiliateIds.has(item.id)).map(item => <p key={item.id} className="text-sm font-bold text-red-800">• {item.name}</p>)}
              <p className="mt-3 text-xs leading-5 text-red-700">Esta ação não pode ser desfeita. Serão excluídos os cadastros, contas de autenticação e todos os eventos, pedidos, comissões e saques relacionados.</p>
            </div>

            <form onSubmit={permanentlyDeleteSelected} className="mt-5 space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Confirmação final</label>
                <p className="mt-1 text-xs text-zinc-500">Digite <strong className="text-red-600">EXCLUIR</strong> para confirmar a exclusão definitiva das {selectedAffiliateIds.size} selecionadas.</p>
                <input value={deletePhrase} onChange={event => setDeletePhrase(event.target.value.toUpperCase())} autoComplete="off" disabled={Boolean(deletingIds.length)} placeholder="EXCLUIR" className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-black uppercase tracking-[.15em] outline-none focus:border-red-400 disabled:bg-zinc-50" />
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button type="button" disabled={Boolean(deletingIds.length)} onClick={() => setDeleteModalOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-600 disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={Boolean(deletingIds.length) || deletePhrase !== 'EXCLUIR'} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">{deletingIds.length ? 'Excluindo definitivamente…' : 'Excluir definitivamente'}</button>
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

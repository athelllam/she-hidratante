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
  if (status === 'processing') return 'Processando Pix'
  if (status === 'approved') return 'Aprovado'
  if (status === 'failed') return 'Falhou'
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
  const [videoSubmissions, setVideoSubmissions] = useState([])
  const [videoFilter, setVideoFilter] = useState('pending')
  const [videoNoteId, setVideoNoteId] = useState(null)
  const [videoNote, setVideoNote] = useState('')
  const [videoBusyId, setVideoBusyId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [payingId, setPayingId] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [message, setMessage] = useState('')
  const [affiliateFilter, setAffiliateFilter] = useState('all')
  const [affiliateSearch, setAffiliateSearch] = useState('')
  const [affiliateSort, setAffiliateSort] = useState('sales_desc')
  const [detailAffiliate, setDetailAffiliate] = useState(null)
  const [detailMonth, setDetailMonth] = useState('all')
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [withdrawalFilter, setWithdrawalFilter] = useState('all')
  const [withdrawalSearch, setWithdrawalSearch] = useState('')
  const [withdrawalMonth, setWithdrawalMonth] = useState('all')
  const [credentialsAffiliate, setCredentialsAffiliate] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [selectedAffiliateIds, setSelectedAffiliateIds] = useState(new Set())
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deletingIds, setDeletingIds] = useState([])
  const [settings, setSettings] = useState({ ticketThreshold: 170, ticketBonus: 5, teamCommissionPerSale: 10, commissions: { none: 30, bronze: 40, silver: 50, gold: 60 }, monthlyLevels: { bronze: 10, silver: 50, gold: 101 }, fixedLevels: { bronze: 100, silver: 300, gold: 500 } })
  const [settingsForm, setSettingsForm] = useState({ ticketThreshold: '170', ticketBonus: '5', teamCommissionPerSale: '10', none: '30', bronze: '40', silver: '50', gold: '60', monthlyBronze: '10', monthlySilver: '50', monthlyGold: '101', fixedBronze: '100', fixedSilver: '300', fixedGold: '500', smallBoostPrice: '30', smallBoostConnections: '5', largeBoostPrice: '50', largeBoostConnections: '10', maxActiveBoosts: '3', resellerHydrant: '0', resellerHydrantBlister: '0', resellerStick: '0', resellerComplete: '0' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingBonusLevels, setSavingBonusLevels] = useState(false)
  const [globalStatsData, setGlobalStatsData] = useState({ all: { sales: 0, revenue: 0, averageTicket: 0, accesses: 0 }, byMonth: {}, snapshots: {} })
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [monthFilterOpen, setMonthFilterOpen] = useState(false)
  const [averageSaleCost, setAverageSaleCost] = useState('0')
  const [boostState, setBoostState] = useState({ activeCount: 0, queueCount: 0, completedCount: 0, active: [] })

  const loadPanel = async () => {
    const [affiliateData, withdrawalData, videoData] = await Promise.all([
      api('/api/admin/affiliates'),
      api('/api/admin/withdrawals'),
      api('/api/admin/affiliates?videos=1'),
    ])
    setAffiliates(affiliateData.affiliates || [])
    setWithdrawals(withdrawalData.withdrawals || [])
    setVideoSubmissions(videoData.videos || [])
    setBoostState(affiliateData.boostState || { activeCount: 0, queueCount: 0, completedCount: 0, active: [] })
    setGlobalStatsData(affiliateData.globalStats || { all: { sales: 0, revenue: 0, averageTicket: 0, accesses: 0 }, byMonth: {}, snapshots: {} })
    setAvailableMonths(affiliateData.availableMonths || [])
    const nextSettings = affiliateData.settings || { ticketThreshold: 170, teamCommissionPerSale: 10, commissions: { none: 30, bronze: 40, silver: 50, gold: 60 }, monthlyLevels: { bronze: 10, silver: 50, gold: 101 }, fixedLevels: { bronze: 100, silver: 300, gold: 500 } }
    setSettings(nextSettings)
    setAverageSaleCost(String(nextSettings.averageSaleCost ?? 0))
    setSettingsForm({
      ticketThreshold: String(nextSettings.ticketThreshold),
      ticketBonus: String(nextSettings.ticketBonus ?? 5),
      teamCommissionPerSale: String(nextSettings.teamCommissionPerSale ?? 10),
      none: String(nextSettings.commissions?.none ?? 30),
      bronze: String(nextSettings.commissions?.bronze ?? 40),
      silver: String(nextSettings.commissions?.silver ?? 50),
      gold: String(nextSettings.commissions?.gold ?? 60),
      monthlyBronze: String(nextSettings.monthlyLevels?.bronze ?? 10),
      monthlySilver: String(nextSettings.monthlyLevels?.silver ?? 50),
      monthlyGold: String(nextSettings.monthlyLevels?.gold ?? 101),
      fixedBronze: String(nextSettings.fixedLevels?.bronze ?? 100),
      fixedSilver: String(nextSettings.fixedLevels?.silver ?? 300),
      fixedGold: String(nextSettings.fixedLevels?.gold ?? 500),
      smallBoostPrice: String(nextSettings.boostPlans?.small?.price ?? 30),
      smallBoostConnections: String(nextSettings.boostPlans?.small?.connections ?? 5),
      largeBoostPrice: String(nextSettings.boostPlans?.large?.price ?? 50),
      largeBoostConnections: String(nextSettings.boostPlans?.large?.connections ?? 10),
      maxActiveBoosts: String(nextSettings.boostPlans?.maxActive ?? 3),
      resellerHydrant: String(nextSettings.resellerPrices?.hydrant ?? 0),
      resellerHydrantBlister: String(nextSettings.resellerPrices?.hydrantBlister ?? 0),
      resellerStick: String(nextSettings.resellerPrices?.stick ?? 0),
      resellerComplete: String(nextSettings.resellerPrices?.complete ?? 0),
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

  useEffect(() => {
    if (!detailAffiliate) return
    let cancelled = false
    setDetailLoading(true)
    setDetailData(null)
    api(`/api/admin/affiliates?detail=${encodeURIComponent(detailAffiliate.id)}&month=${encodeURIComponent(detailMonth)}`)
      .then(data => { if (!cancelled) setDetailData(data) })
      .catch(error => { if (!cancelled) setMessage(error.message || 'Não foi possível carregar o desempenho.') })
      .finally(() => { if (!cancelled) setDetailLoading(false) })
    return () => { cancelled = true }
  }, [detailAffiliate, detailMonth])

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

  const reviewVideo = async (video, status) => {
    const label = status === 'approved' ? 'aprovar' : 'rejeitar'
    const note = videoNoteId === video.id ? videoNote.trim() : ''
    if (status === 'rejected' && !note) {
      setVideoNoteId(video.id)
      setMessage('Informe uma observação ao rejeitar o vídeo.')
      return
    }
    if (!window.confirm(`Confirmar ${label} a solicitação de vídeo de ${video.affiliates?.name || 'Afiliada'}?`)) return
    setVideoBusyId(video.id)
    setMessage('')
    try {
      await api('/api/admin/affiliates', { method: 'PATCH', body: JSON.stringify({ action: 'video_review', id: video.id, status, note }) })
      await loadPanel()
      setVideoNoteId(null)
      setVideoNote('')
      setMessage(`Vídeo ${status === 'approved' ? 'aprovado' : 'rejeitado'}. O painel da afiliada já foi atualizado.`)
    } catch (e) {
      setMessage(e.message || 'Não foi possível atualizar o vídeo.')
    } finally {
      setVideoBusyId(null)
    }
  }

  const markPaid = async (withdrawal) => {
    if (!window.confirm(`Aprovar o saque de ${brl(withdrawal.amount)} da afiliada ${withdrawal.affiliates?.name || '—'} e enviar o Pix automaticamente para a chave cadastrada?`)) return

    setPayingId(withdrawal.id)
    setMessage('')
    try {
      const result = await api('/api/admin/withdrawals', {
        method: 'PATCH',
        body: JSON.stringify({ id: withdrawal.id, action: 'approve' }),
      })
      await loadPanel()
      setMessage(result.message || 'Saque aprovado e enviado para processamento pelo Asaas.')
    } catch (e) {
      setMessage(e.message || 'Não foi possível processar o saque.')
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

  const saveBonusLevels = async () => {
    const monthlyLevels = {
      bronze: Number.parseInt(String(settingsForm.monthlyBronze).trim(), 10),
      silver: Number.parseInt(String(settingsForm.monthlySilver).trim(), 10),
      gold: Number.parseInt(String(settingsForm.monthlyGold).trim(), 10),
    }
    const fixedLevels = {
      bronze: Number.parseInt(String(settingsForm.fixedBronze).trim(), 10),
      silver: Number.parseInt(String(settingsForm.fixedSilver).trim(), 10),
      gold: Number.parseInt(String(settingsForm.fixedGold).trim(), 10),
    }
    const allValid = [...Object.values(monthlyLevels), ...Object.values(fixedLevels)].every(value => Number.isInteger(value) && value > 0)
    const monthlyOrdered = monthlyLevels.bronze < monthlyLevels.silver && monthlyLevels.silver < monthlyLevels.gold
    const fixedOrdered = fixedLevels.bronze < fixedLevels.silver && fixedLevels.silver < fixedLevels.gold
    if (!allValid || !monthlyOrdered || !fixedOrdered) {
      setMessage('As metas devem ser números inteiros positivos e crescentes: Bronze < Prata < Ouro.')
      return
    }
    setSavingBonusLevels(true)
    setMessage('')
    try {
      const result = await api('/api/admin/affiliates', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'update_bonus_levels', monthlyLevels, fixedLevels }),
      })
      const next = result.settings || {}
      setSettings(current => ({ ...current, monthlyLevels: next.monthlyLevels || monthlyLevels, fixedLevels: next.fixedLevels || fixedLevels }))
      setSettingsForm(current => ({
        ...current,
        monthlyBronze: String(next.monthlyLevels?.bronze ?? monthlyLevels.bronze),
        monthlySilver: String(next.monthlyLevels?.silver ?? monthlyLevels.silver),
        monthlyGold: String(next.monthlyLevels?.gold ?? monthlyLevels.gold),
        fixedBronze: String(next.fixedLevels?.bronze ?? fixedLevels.bronze),
        fixedSilver: String(next.fixedLevels?.silver ?? fixedLevels.silver),
        fixedGold: String(next.fixedLevels?.gold ?? fixedLevels.gold),
      }))
      setMessage('Metas do Bônus Mensal e Bônus Fixo atualizadas.')
      await loadPanel()
    } catch (e) {
      setMessage(e.message || 'Não foi possível atualizar as metas dos bônus.')
    } finally {
      setSavingBonusLevels(false)
    }
  }

  const saveSettings = async (event) => {
    event.preventDefault()
    setSavingSettings(true)
    setMessage('')
    try {
      const payload = {
        ticketThreshold: Number(String(settingsForm.ticketThreshold).replace(',', '.')),
        ticketBonus: Number(String(settingsForm.ticketBonus).replace(',', '.')),
        teamCommissionPerSale: Number(String(settingsForm.teamCommissionPerSale).replace(',', '.')),
        commissions: {
          none: Number(String(settingsForm.none).replace(',', '.')),
          bronze: Number(String(settingsForm.bronze).replace(',', '.')),
          silver: Number(String(settingsForm.silver).replace(',', '.')),
          gold: Number(String(settingsForm.gold).replace(',', '.')),
        },
        monthlyLevels: {
          bronze: Number(settingsForm.monthlyBronze),
          silver: Number(settingsForm.monthlySilver),
          gold: Number(settingsForm.monthlyGold),
        },
        fixedLevels: {
          bronze: Number(settingsForm.fixedBronze),
          silver: Number(settingsForm.fixedSilver),
          gold: Number(settingsForm.fixedGold),
        },
        boostPlans: {
          small: { price: Number(String(settingsForm.smallBoostPrice).replace(',', '.')), connections: Number(settingsForm.smallBoostConnections) },
          large: { price: Number(String(settingsForm.largeBoostPrice).replace(',', '.')), connections: Number(settingsForm.largeBoostConnections) },
          maxActive: Number(settingsForm.maxActiveBoosts),
        },
        resellerPrices: {
          hydrant: Number(String(settingsForm.resellerHydrant).replace(',', '.')),
          hydrantBlister: Number(String(settingsForm.resellerHydrantBlister).replace(',', '.')),
          stick: Number(String(settingsForm.resellerStick).replace(',', '.')),
          complete: Number(String(settingsForm.resellerComplete).replace(',', '.')),
        },
      }
      if (!Number.isFinite(payload.ticketThreshold) || payload.ticketThreshold <= 0 || !Number.isFinite(payload.ticketBonus) || payload.ticketBonus < 0 || !Number.isFinite(payload.teamCommissionPerSale) || payload.teamCommissionPerSale < 0 || Object.values(payload.commissions).some(value => !Number.isFinite(value) || value < 0) || Object.values(payload.monthlyLevels).some(value => !Number.isInteger(value) || value <= 0) || Object.values(payload.fixedLevels).some(value => !Number.isInteger(value) || value <= 0) || Object.values(payload.resellerPrices).some(value => !Number.isFinite(value) || value < 0) || payload.boostPlans.small.price <= 0 || !Number.isInteger(payload.boostPlans.small.connections) || payload.boostPlans.small.connections <= 0 || payload.boostPlans.large.price <= 0 || !Number.isInteger(payload.boostPlans.large.connections) || payload.boostPlans.large.connections <= 0 || !Number.isInteger(payload.boostPlans.maxActive) || payload.boostPlans.maxActive <= 0 || !(payload.monthlyLevels.bronze < payload.monthlyLevels.silver && payload.monthlyLevels.silver < payload.monthlyLevels.gold) || !(payload.fixedLevels.bronze < payload.fixedLevels.silver && payload.fixedLevels.silver < payload.fixedLevels.gold)) {
        throw new Error('Informe valores válidos. As metas devem ser números inteiros e crescentes: Bronze < Prata < Ouro.')
      }
      const result = await api('/api/admin/affiliates', {
        method: 'PATCH',
        body: JSON.stringify({ settings: payload }),
      })
      setSettings(result.settings)
      setSettingsForm({
        ticketThreshold: String(result.settings.ticketThreshold),
        ticketBonus: String(result.settings.ticketBonus ?? 5),
        teamCommissionPerSale: String(result.settings.teamCommissionPerSale ?? 10),
        none: String(result.settings.commissions.none),
        bronze: String(result.settings.commissions.bronze),
        silver: String(result.settings.commissions.silver),
        gold: String(result.settings.commissions.gold),
        monthlyBronze: String(result.settings.monthlyLevels?.bronze ?? 10),
        monthlySilver: String(result.settings.monthlyLevels?.silver ?? 50),
        monthlyGold: String(result.settings.monthlyLevels?.gold ?? 101),
        fixedBronze: String(result.settings.fixedLevels?.bronze ?? 100),
        fixedSilver: String(result.settings.fixedLevels?.silver ?? 300),
        fixedGold: String(result.settings.fixedLevels?.gold ?? 500),
        smallBoostPrice: String(result.settings.boostPlans?.small?.price ?? 30),
        smallBoostConnections: String(result.settings.boostPlans?.small?.connections ?? 5),
        largeBoostPrice: String(result.settings.boostPlans?.large?.price ?? 50),
        largeBoostConnections: String(result.settings.boostPlans?.large?.connections ?? 10),
        maxActiveBoosts: String(result.settings.boostPlans?.maxActive ?? 3),
        resellerHydrant: String(result.settings.resellerPrices?.hydrant ?? 0),
        resellerHydrantBlister: String(result.settings.resellerPrices?.hydrantBlister ?? 0),
        resellerStick: String(result.settings.resellerPrices?.stick ?? 0),
        resellerComplete: String(result.settings.resellerPrices?.complete ?? 0),
      })
      setMessage('Configurações de comissões e metas dos Bônus Mensal e Fixo atualizadas para todas as afiliadas.')
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
    if (!selectedMonths.length) {
      const totalSales = Number(globalStatsData.all?.sales || 0)
      const totalRevenue = Number(globalStatsData.all?.revenue || 0)
      const totalAccesses = Number(globalStatsData.all?.accesses || 0)
      const pending = withdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
      return {
        affiliates: affiliates.length,
        active: affiliates.filter(item => item.adminActive).length,
        inactive: affiliates.filter(item => !item.adminActive).length,
        totalSales,
        totalRevenue,
        totalAccesses,
        averageTicket: totalSales ? totalRevenue / totalSales : 0,
        personalCommission: Number(globalStatsData.all?.personalCommission || 0),
        teamCommission: Number(globalStatsData.all?.teamCommission || 0),
        totalCommission: Number(globalStatsData.all?.totalCommission || 0),
        averageCommissionPerSale: Number(globalStatsData.all?.averageCommissionPerSale || 0),
        totalBalance: affiliates.reduce((sum, affiliate) => sum + Number(affiliate.totalBalance ?? (Number(affiliate.balance || 0) + Number(affiliate.teamBalance || 0))), 0),
        pendingCount: pending.length,
        pendingAmount: pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      }
    }

    // Para 1 ou vários meses: vendas/faturamento/ticket são acumulados apenas
    // nos meses selecionados; afiliadas/ativas/inativas/saldo são o snapshot
    // do fechamento do último mês selecionado.
    const selected = selectedMonths.reduce((acc, month) => {
      const value = globalStatsData.byMonth?.[month]
      if (!value) return acc
      acc.sales += Number(value.sales || 0)
      acc.revenue += Number(value.revenue || 0)
      acc.accesses += Number(value.accesses || 0)
      acc.personalCommission += Number(value.personalCommission || 0)
      acc.teamCommission += Number(value.teamCommission || 0)
      return acc
    }, { sales: 0, revenue: 0, accesses: 0, personalCommission: 0, teamCommission: 0 })
    const snapshotMonth = [...selectedMonths].sort().at(-1)
    const snapshot = globalStatsData.snapshots?.[snapshotMonth] || {}
    const pending = withdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
    return {
      affiliates: Number(snapshot.affiliates || 0),
      active: Number(snapshot.active || 0),
      inactive: Number(snapshot.inactive || 0),
      totalSales: selected.sales,
      totalRevenue: selected.revenue,
      totalAccesses: selected.accesses,
      averageTicket: selected.sales ? selected.revenue / selected.sales : 0,
      personalCommission: selected.personalCommission,
      teamCommission: selected.teamCommission,
      totalCommission: selected.personalCommission + selected.teamCommission,
      averageCommissionPerSale: selected.sales ? (selected.personalCommission + selected.teamCommission) / selected.sales : 0,
      totalBalance: Number(snapshot.totalBalance || 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    }
  }, [affiliates, withdrawals, globalStatsData, selectedMonths])

  const parsedAverageSaleCost = Math.max(0, Number(String(averageSaleCost).replace(',', '.')) || 0)
  const contributionMargin = stats.averageTicket - parsedAverageSaleCost - stats.averageCommissionPerSale
  const contributionMarginPercent = stats.averageTicket > 0 ? (contributionMargin / stats.averageTicket) * 100 : 0

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
      const nameCompare = String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR', { sensitivity: 'base' })
      if (affiliateSort === 'days_desc') return Number(b.daysWithoutSales || 0) - Number(a.daysWithoutSales || 0) || nameCompare
      if (affiliateSort === 'revenue_desc') return Number(b.revenue || 0) - Number(a.revenue || 0) || nameCompare
      if (affiliateSort === 'accesses_desc') return Number(b.accesses || 0) - Number(a.accesses || 0) || nameCompare
      if (affiliateSort === 'ticket_desc') return Number(b.averageTicket || 0) - Number(a.averageTicket || 0) || nameCompare
      if (affiliateSort === 'name_asc') return nameCompare
      if (affiliateSort === 'created_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() || nameCompare
      return Number(b.sales || 0) - Number(a.sales || 0) || nameCompare
    })
  }, [affiliates, affiliateFilter, affiliateSearch, affiliateSort])

  const filteredWithdrawals = useMemo(() => {
    let rows = withdrawals
    if (withdrawalFilter === 'pending') rows = rows.filter(item => item.status === 'pending' || item.status === 'approved')
    if (withdrawalFilter === 'paid') rows = rows.filter(item => item.status === 'paid')
    if (withdrawalFilter === 'rejected') rows = rows.filter(item => item.status === 'rejected')
    const q = String(withdrawalSearch || '').trim().toLowerCase()
    if (q) rows = rows.filter(item => String(item.affiliate_id || '').includes(q))
    if (withdrawalMonth !== 'all') {
      rows = rows.filter(item => {
        const date = new Date(item.requested_at || item.date || 0)
        if (Number.isNaN(date.getTime())) return false
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        return key === withdrawalMonth
      })
    }
    return rows
  }, [withdrawals, withdrawalFilter, withdrawalSearch, withdrawalMonth])

  const orderedWithdrawals = useMemo(() => {
    const priority = { pending: 0, approved: 1, processing: 2, paid: 3, failed: 4, rejected: 5, cancelled: 6 }
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
              <p className="mt-1 text-sm font-semibold text-zinc-600">{selectedMonths.length ? `${selectedMonths.length} ${selectedMonths.length === 1 ? 'mês selecionado' : 'meses selecionados'}` : 'Acumulado · todos os meses'}</p>
            </div>
            <div className="relative">
              <button type="button" onClick={() => setMonthFilterOpen(current => !current)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-800 shadow-sm hover:border-pink-300">
                {selectedMonths.length ? 'Alterar período' : 'Acumulado / filtrar por mês'} ▾
              </button>
              {monthFilterOpen && (
                <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_20px_60px_rgba(0,0,0,.12)]">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black text-zinc-950">Período dos indicadores</p>
                    <button type="button" onClick={clearMonthFilter} className="text-xs font-bold text-pink-500">Acumulado</button>
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              [selectedMonths.length ? 'Acessos no período' : 'Acessos acumulados', stats.totalAccesses],
              [selectedMonths.length ? 'Vendas no período' : 'Vendas acumuladas', stats.totalSales],
              [selectedMonths.length ? 'Faturamento no período' : 'Faturamento acumulado', brl(stats.totalRevenue)],
              ['Ticket médio', brl(stats.averageTicket)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Comissão média por venda</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{brl(stats.averageCommissionPerSale)}</p>
              <p className="mt-1 text-xs text-zinc-400">Comissões pessoais + equipe ÷ vendas pagas</p>
            </div>
            <div className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Comissão total</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{brl(stats.totalCommission)}</p>
            </div>
            <div className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <label htmlFor="average-sale-cost" className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Custo médio por venda (R$)</label>
              <input
                id="average-sale-cost"
                type="number"
                min="0"
                step="0.01"
                value={averageSaleCost}
                onChange={(event) => setAverageSaleCost(event.target.value)}
                onBlur={async () => {
                  const parsed = Number(averageSaleCost)
                  if (!Number.isFinite(parsed) || parsed < 0) {
                    setMessage('Informe um custo médio válido, maior ou igual a zero.')
                    return
                  }
                  try {
                    await api('/api/admin/affiliates', {
                      method: 'PATCH',
                      body: JSON.stringify({ action: 'update_average_sale_cost', averageSaleCost: parsed }),
                    })
                    setAverageSaleCost(String(parsed))
                    setSettings((current) => ({ ...current, averageSaleCost: parsed }))
                    setMessage('Custo médio por venda salvo no banco de dados.')
                  } catch (saveError) {
                    setMessage(saveError.message || 'Não foi possível salvar o custo médio por venda.')
                  }
                }}
                className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-lg font-black text-zinc-950 outline-none focus:border-pink-400"
              />
              <p className="mt-1 text-xs text-zinc-400">Salvo no banco de dados</p>
            </div>
          </div>

          <div className="mt-3 rounded-[1.5rem] border border-pink-200 bg-pink-50/60 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink-500">Margem de contribuição estimada</p>
                <p className="mt-2 text-3xl font-black text-zinc-950">{brl(contributionMargin)} <span className="text-lg">({contributionMarginPercent.toFixed(1).replace('.', ',')}%)</span></p>
                <p className="mt-1 text-xs text-zinc-500">Ticket médio − custo médio por venda − comissão média paga. Antes das despesas fixas.</p>
              </div>
              <div className="text-sm text-zinc-600">
                <p>Ticket médio: <strong>{brl(stats.averageTicket)}</strong></p>
                <p>Custo por venda: <strong>{brl(parsedAverageSaleCost)}</strong></p>
                <p>Comissão média: <strong>{brl(stats.averageCommissionPerSale)}</strong></p>
              </div>
            </div>
          </div>

          <div className="my-5 h-px w-full bg-zinc-200/70" aria-hidden="true" />

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Afiliadas', stats.affiliates],
              ['Ativas', stats.active],
              ['Inativas', stats.inactive],
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
              <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
                <span>Ordenar por</span>
                <select value={affiliateSort} onChange={event => setAffiliateSort(event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 outline-none focus:border-pink-400">
                  <option value="days_desc">Mais dias sem vendas</option>
                  <option value="sales_desc">Mais vendas</option>
                  <option value="revenue_desc">Maior faturamento</option>
                  <option value="accesses_desc">Mais acessos</option>
                  <option value="ticket_desc">Maior ticket médio</option>
                  <option value="created_desc">Mais novas</option>
                  <option value="name_asc">Nome A–Z</option>
                </select>
              </label>
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

          <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-zinc-100 text-left text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">
                  <th className="pb-3 pr-4">Afiliada</th>
                  <th className="pb-3 pr-4">Acessos</th>
                  <th className="pb-3 pr-4">Vendas</th>
                  <th className="pb-3 pr-4">Faturamento</th>
                  <th className="pb-3 pr-4">Ticket médio</th>
                  <th className="pb-3 pr-4">Saldo</th>
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Data de entrada</th>
                  <th className="pb-3 pr-4">Ativa/Inativa</th>
                  <th className="pb-3 pr-4">Sem vendas</th>
                  <th className="pb-3 pr-4">Desempenho</th>
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
                    <td className="py-4 pr-4 font-black text-zinc-950">{affiliate.accesses || 0}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{affiliate.sales}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{brl(affiliate.revenue)}</td>
                    <td className="py-4 pr-4 font-black text-zinc-950">{brl(affiliate.averageTicket)}</td>
                    <td className="py-4 pr-4 font-black text-emerald-600">{brl(Number(affiliate.totalBalance ?? (Number(affiliate.balance || 0) + Number(affiliate.teamBalance || 0))))}</td>
                    <td className="py-4 pr-4 font-bold text-zinc-600">{affiliate.id}</td>
                    <td className="py-4 pr-4 font-bold text-zinc-700">{affiliate.created_at ? new Date(affiliate.created_at).toLocaleDateString('pt-BR') : '—'}</td>
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
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${Number(affiliate.daysWithoutSales || 0) >= 7 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'}`}>
                        {Number(affiliate.daysWithoutSales || 0)} {Number(affiliate.daysWithoutSales || 0) === 1 ? 'dia' : 'dias'} sem vendas
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <button
                        type="button"
                        onClick={() => { setDetailAffiliate(affiliate); setDetailMonth('all') }}
                        className="rounded-xl bg-zinc-950 px-3 py-2 text-xs font-black text-white transition hover:bg-pink-500"
                      >
                        Ver desempenho
                      </button>
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
                    <td colSpan={13} className="py-10 text-center text-sm font-semibold text-zinc-400">
                      Nenhuma afiliada encontrada{affiliateSearch ? ` para "${affiliateSearch}"` : ''}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>


        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Conteúdo das afiliadas</p>
              <h2 className="mt-1 text-2xl font-black text-zinc-950">Solicitações de vídeos</h2>
              <p className="mt-1 text-sm text-zinc-400">Analise os links enviados. Ao aprovar, a SHE poderá usar o vídeo em divulgação com tráfego pago usando o link da afiliada.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterPill active={videoFilter === 'pending'} onClick={() => setVideoFilter('pending')}>Pendentes · {videoSubmissions.filter(v => v.status === 'pending').length}</FilterPill>
              <FilterPill active={videoFilter === 'approved'} onClick={() => setVideoFilter('approved')}>Aprovados · {videoSubmissions.filter(v => v.status === 'approved').length}</FilterPill>
              <FilterPill active={videoFilter === 'rejected'} onClick={() => setVideoFilter('rejected')}>Rejeitados · {videoSubmissions.filter(v => v.status === 'rejected').length}</FilterPill>
              <FilterPill active={videoFilter === 'all'} onClick={() => setVideoFilter('all')}>Todos · {videoSubmissions.length}</FilterPill>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {videoSubmissions.filter(video => videoFilter === 'all' || video.status === videoFilter).map(video => (
              <div key={video.id} className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-black text-zinc-950">{video.affiliates?.name || 'Afiliada'}</p><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-zinc-500">ID {video.affiliate_id}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${video.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : video.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{video.status === 'approved' ? 'Aprovado' : video.status === 'rejected' ? 'Rejeitado' : 'Pendente'}</span></div>
                    <p className="mt-1 text-xs text-zinc-400">Enviado em {dateTime(video.created_at)} · Solicitação #{video.id}</p>
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-white px-3 py-2"><p className="break-all text-xs font-semibold text-zinc-600">{video.video_url}</p><p className="mt-1 text-[10px] font-black uppercase tracking-wider text-zinc-400">O link é exibido apenas como texto e não é aberto automaticamente.</p></div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
                    {video.status === 'pending' && <>
                      <button type="button" onClick={() => reviewVideo(video, 'approved')} disabled={videoBusyId === video.id} className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{videoBusyId === video.id ? 'Salvando…' : 'Aprovar'}</button>
                      <button type="button" onClick={() => { setVideoNoteId(video.id); setVideoNote(video.note || '') }} disabled={videoBusyId === video.id} className="rounded-xl bg-red-500 px-4 py-3 text-xs font-black text-white disabled:opacity-50">Rejeitar</button>
                    </>}
                  </div>
                </div>
                {video.status === 'pending' && videoNoteId === video.id && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input autoFocus value={videoNote} onChange={e => setVideoNote(e.target.value)} placeholder="Observação para a afiliada" className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-pink-400" /><button type="button" onClick={() => reviewVideo(video, 'rejected')} disabled={videoBusyId === video.id} className="rounded-xl bg-red-500 px-4 py-3 text-xs font-black text-white">Confirmar rejeição</button></div>}
                {video.note && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-zinc-600"><strong>Observação:</strong> {video.note}</p>}
              </div>
            ))}
            {!videoSubmissions.filter(video => videoFilter === 'all' || video.status === videoFilter).length && <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">Nenhuma solicitação de vídeo neste filtro.</div>}
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-black text-zinc-950">Configurações de bônus</h2>
            <p className="mt-1 text-sm text-zinc-400">Configure os valores pagos por pedido e as metas de vendas dos Bônus Mensal e Fixo. A mudança vale para todas as afiliadas.</p>
          </div>

          <form onSubmit={saveSettings} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-amber-700">Meta ticket médio</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-black text-zinc-500">R$</span>
                <input value={settingsForm.ticketThreshold} onChange={e => setSettingsForm(v => ({ ...v, ticketThreshold: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-amber-400" />
              </div>
              <p className="mt-2 text-[10px] font-semibold text-amber-700">Acima dessa meta, entra o bônus de +R$ 5,00/pedido.</p>
            </label>

            <label className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-fuchsia-600">Bônus de ticket · por pedido</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-black text-zinc-500">R$</span>
                <input value={settingsForm.ticketBonus} onChange={e => setSettingsForm(v => ({ ...v, ticketBonus: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-fuchsia-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-fuchsia-400" />
              </div>
              <p className="mt-2 text-[10px] font-semibold text-fuchsia-700">Valor adicional por pedido quando o ticket médio supera a meta.</p>
            </label>

            <label className="rounded-2xl border border-pink-200 bg-pink-50 p-4">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-pink-600">Equipe · por venda</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-black text-zinc-500">R$</span>
                <input value={settingsForm.teamCommissionPerSale} onChange={e => setSettingsForm(v => ({ ...v, teamCommissionPerSale: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-pink-400" />
              </div>
              <p className="mt-2 text-[10px] font-semibold text-pink-600">Valor pago por cada venda aprovada de uma afiliada direta da equipe.</p>
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

            <div className="md:col-span-2 xl:col-span-3 rounded-[1.5rem] border border-pink-100 bg-pink-50/50 p-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-pink-600">Bônus Mensal · vendas no mês</p>
              <p className="mt-1 text-[10px] text-pink-500">Quantidade de vendas necessárias para cada nível dentro do mês.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[['monthlyBronze','Bronze'],['monthlySilver','Prata'],['monthlyGold','Ouro']].map(([key,label]) => <label key={key}><span className="text-[10px] font-black uppercase text-zinc-500">{label}</span><input value={settingsForm[key]} onChange={e => setSettingsForm(v => ({...v,[key]:e.target.value}))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-pink-400" /></label>)}
              </div>
            </div>
            <div className="md:col-span-2 xl:col-span-3 rounded-[1.5rem] border border-amber-200 bg-amber-50/60 p-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-amber-700">Bônus Fixo · vendas acumuladas</p>
              <p className="mt-1 text-[10px] text-amber-700">Ao atingir cada meta, o nível vira um piso permanente do Bônus Mensal.</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[['fixedBronze','Bronze'],['fixedSilver','Prata'],['fixedGold','Ouro']].map(([key,label]) => <label key={key}><span className="text-[10px] font-black uppercase text-zinc-500">{label}</span><input value={settingsForm[key]} onChange={e => setSettingsForm(v => ({...v,[key]:e.target.value}))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-amber-400" /></label>)}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-6 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-400">Atual: Mensal {settings.monthlyLevels?.bronze}/{settings.monthlyLevels?.silver}/{settings.monthlyLevels?.gold} vendas · Fixo {settings.fixedLevels?.bronze}/{settings.fixedLevels?.silver}/{settings.fixedLevels?.gold} vendas · Bronze {brl(settings.commissions?.bronze)} · Prata {brl(settings.commissions?.silver)} · Ouro {brl(settings.commissions?.gold)}</p>
              <button disabled={savingSettings} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500 disabled:opacity-50">{savingSettings ? 'Atualizando…' : 'Atualizar configurações'}</button>
            </div>
          </form>

          <div className="mt-5 border-t border-zinc-100 pt-5">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink-500">Revendedora</p>
              <h3 className="text-xl font-black text-zinc-950">Preços especiais de revenda</h3>
              <p className="text-sm text-zinc-400">Esses valores alimentam exclusivamente a página /revendedora e não alteram os preços da loja.</p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[[['resellerHydrant','Hidratante'],['resellerHydrantBlister','Hidratante + Blister']],[['resellerStick','Stick'],['resellerComplete','Kit Completo']]].flat().map(([key,label]) => (
                <label key={key} className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4">
                  <span className="text-[10px] font-black uppercase tracking-[.14em] text-pink-600">{label}</span>
                  <div className="mt-2 flex items-center gap-2"><span className="font-black text-zinc-500">R$</span><input value={settingsForm[key]} onChange={e => setSettingsForm(v => ({ ...v, [key]: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-pink-400" /></div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink-500">Impulsionar Equipe</p>
                <h3 className="mt-1 text-xl font-black text-zinc-950">Planos e capacidade</h3>
                <p className="mt-1 text-sm text-zinc-400">A fila é única. O sistema mantém automaticamente o número máximo de impulsos ativos.</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-zinc-50 px-4 py-3"><p className="text-[9px] font-black uppercase text-zinc-400">Ativos</p><p className="mt-1 text-xl font-black">{boostState.activeCount}</p></div>
                <div className="rounded-xl bg-zinc-50 px-4 py-3"><p className="text-[9px] font-black uppercase text-zinc-400">Fila</p><p className="mt-1 text-xl font-black">{boostState.queueCount}</p></div>
                <div className="rounded-xl bg-zinc-50 px-4 py-3"><p className="text-[9px] font-black uppercase text-zinc-400">Concluídos</p><p className="mt-1 text-xl font-black">{boostState.completedCount}</p></div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4"><span className="text-[10px] font-black uppercase tracking-[.14em] text-pink-600">Plano R$30</span><div className="mt-2 grid grid-cols-2 gap-2"><input value={settingsForm.smallBoostPrice} onChange={e => setSettingsForm(v => ({ ...v, smallBoostPrice: e.target.value }))} inputMode="decimal" className="rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /><input value={settingsForm.smallBoostConnections} onChange={e => setSettingsForm(v => ({ ...v, smallBoostConnections: e.target.value }))} inputMode="numeric" className="rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /></div><p className="mt-2 text-[10px] text-zinc-400">Preço · conexões</p></label>
              <label className="rounded-2xl border border-pink-100 bg-pink-50/50 p-4"><span className="text-[10px] font-black uppercase tracking-[.14em] text-pink-600">Plano R$50</span><div className="mt-2 grid grid-cols-2 gap-2"><input value={settingsForm.largeBoostPrice} onChange={e => setSettingsForm(v => ({ ...v, largeBoostPrice: e.target.value }))} inputMode="decimal" className="rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /><input value={settingsForm.largeBoostConnections} onChange={e => setSettingsForm(v => ({ ...v, largeBoostConnections: e.target.value }))} inputMode="numeric" className="rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /></div><p className="mt-2 text-[10px] text-zinc-400">Preço · conexões</p></label>
              <label className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><span className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-500">Máximo de impulsos ativos</span><input value={settingsForm.maxActiveBoosts} onChange={e => setSettingsForm(v => ({ ...v, maxActiveBoosts: e.target.value }))} inputMode="numeric" className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-lg font-black" /><p className="mt-2 text-[10px] text-zinc-400">Quando uma vaga abre, a próxima da fila é ativada automaticamente.</p></label>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xs font-black text-zinc-800">Impulsos ativos agora</p>
              <div className="mt-3 grid gap-2 md:grid-cols-3">{(boostState.active || []).map(item => <div key={item.id} className="rounded-xl bg-white px-3 py-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black">{item.name}</p><span className="text-[10px] font-black text-pink-600">{brl(item.price)}</span></div><p className="mt-1 text-[10px] text-zinc-400">{item.connections_remaining} de {item.connections_total} conexões restantes</p></div>)}{!(boostState.active || []).length && <p className="text-xs text-zinc-400">Nenhum impulso ativo.</p>}</div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Solicitações de saque</h2>
              <p className="mt-1 text-sm text-zinc-400">Pague a afiliada primeiro. Depois clique em “Marcar como pago”.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Buscar por ID</span>
              <input value={withdrawalSearch} onChange={e => setWithdrawalSearch(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="ID da afiliada" className="w-32 bg-transparent text-sm font-black text-zinc-800 outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Mês</span>
              <select value={withdrawalMonth} onChange={e => setWithdrawalMonth(e.target.value)} className="bg-transparent text-sm font-black text-zinc-800 outline-none">
                <option value="all">Todos os meses</option>
                {Array.from(new Set(withdrawals.map(item => {
                  const date = new Date(item.requested_at || item.date || 0)
                  if (Number.isNaN(date.getTime())) return null
                  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
                }).filter(Boolean))).sort().reverse().map(month => {
                  const [year, monthNumber] = month.split('-')
                  const label = new Date(Number(year), Number(monthNumber) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                  return <option key={month} value={month}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>
                })}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <FilterPill active={withdrawalFilter === 'all'} onClick={() => setWithdrawalFilter('all')}>Todos · {withdrawals.length}</FilterPill>
              <FilterPill active={withdrawalFilter === 'pending'} onClick={() => setWithdrawalFilter('pending')}>Pendentes · {stats.pendingCount}</FilterPill>
              <FilterPill active={withdrawalFilter === 'paid'} onClick={() => setWithdrawalFilter('paid')}>Pagos · {withdrawals.filter(item => item.status === 'paid').length}</FilterPill><FilterPill active={withdrawalFilter === 'rejected'} onClick={() => setWithdrawalFilter('rejected')}>Recusados · {withdrawals.filter(item => item.status === 'rejected').length}</FilterPill>
            </div>
            </div>
          </div>

          <div className="mt-5 max-h-[500px] space-y-3 overflow-y-auto pr-1">
            {orderedWithdrawals.map(withdrawal => {
              const pending = withdrawal.status === 'pending' || withdrawal.status === 'approved'
              return (
                <div key={withdrawal.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black text-zinc-950">{withdrawal.affiliates?.name || 'Afiliada'}</p>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-zinc-500">ID {withdrawal.affiliate_id}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${withdrawal.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : withdrawal.status === 'processing' ? 'bg-blue-100 text-blue-700' : withdrawal.status === 'failed' || withdrawal.status === 'rejected' ? 'bg-red-100 text-red-700' : pending ? 'bg-amber-100 text-amber-800' : 'bg-zinc-200 text-zinc-600'}`}>
                        {withdrawalLabel(withdrawal.status)}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${withdrawal.source === 'team' ? 'bg-pink-100 text-pink-700' : 'bg-zinc-100 text-zinc-600'}`}>{withdrawal.source === 'team' ? 'Equipe' : 'Pessoal'}</span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-400">Solicitado em {dateTime(withdrawal.requested_at)} · Saque #{withdrawal.id}</p>
                    <p className="mt-1 text-xs font-semibold text-zinc-600">PIX para recebimento: <span className="break-all font-bold text-zinc-900">{withdrawal.pix_key || 'Não informado (saque antigo)'}</span>{withdrawal.pix_key_type ? <span className="ml-1 text-zinc-400">({withdrawal.pix_key_type})</span> : null}</p>{withdrawal.status === 'rejected' && withdrawal.note && <p className="mt-1 text-xs font-semibold text-red-600"><strong>Motivo da recusa:</strong> {withdrawal.note}</p>}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <span className="text-xl font-black text-zinc-950">{brl(withdrawal.amount)}</span>
                    {pending && (
                      <>
                        <button
                          onClick={async () => {
                            const note = window.prompt('Motivo da recusa (opcional):', '')
                            if (note === null) return
                            setPayingId(withdrawal.id)
                            try {
                              const result = await api('/api/admin/withdrawals', {
                                method: 'PATCH',
                                body: JSON.stringify({ id: withdrawal.id, action: 'reject', note }),
                              })
                              setMessage(result.message || 'Saque recusado. O saldo foi devolvido para a afiliada.')
                              await loadPanel()
                            } catch (e) {
                              setMessage(e.message || 'Não foi possível recusar o saque.')
                            } finally {
                              setPayingId(null)
                            }
                          }}
                          disabled={payingId === withdrawal.id}
                          className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => markPaid(withdrawal)}
                          disabled={payingId === withdrawal.id}
                          className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:opacity-60"
                        >
                          {payingId === withdrawal.id ? 'Enviando Pix…' : 'Aprovar e enviar Pix'}
                        </button>
                      </>
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

      {detailAffiliate && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/55 px-3 py-5 sm:px-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailAffiliate(null) }}>
          <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] bg-zinc-50 p-4 shadow-[0_30px_100px_rgba(0,0,0,.3)] sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Desempenho detalhado</p>
                <h3 className="mt-1 text-2xl font-black text-zinc-950">{detailAffiliate.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">Vendas da afiliada em rosa e vendas da equipe em preto, no mesmo período.</p>
              </div>
              <div className="flex items-center gap-2">
                <select value={detailMonth} onChange={event => setDetailMonth(event.target.value)} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 outline-none focus:border-pink-400">
                  <option value="all">Todo o período</option>
                  {availableMonths.map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}
                </select>
                <button type="button" onClick={() => setDetailAffiliate(null)} className="h-11 w-11 rounded-full bg-white text-xl text-zinc-500 shadow-sm">×</button>
              </div>
            </div>

            {detailLoading ? (
              <div className="mt-6 rounded-[1.5rem] border border-zinc-200 bg-white py-24 text-center text-sm font-bold text-zinc-400">Carregando desempenho…</div>
            ) : detailData ? (
              <>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Acessos', detailData.metrics?.accesses || 0],
                    ['Vendas', detailData.metrics?.sales || 0],
                    ['Faturamento', brl(detailData.metrics?.revenue || 0)],
                    ['Ticket médio', brl(detailData.metrics?.averageTicket || 0)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
                      <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-black text-zinc-950">{detailMonth === 'all' ? 'Desempenho mensal' : 'Desempenho diário'}</h4>
                      <p className="mt-1 text-sm text-zinc-400">{detailMonth === 'all' ? 'Barras por mês em todo o período' : `Barras por dia em ${monthLabel(detailMonth)}`}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">
                      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-pink-400" /> Afiliada</span>
                      <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-zinc-900" /> Equipe</span>
                    </div>
                  </div>

                  {(() => {
                    const rows = detailData.chart || []
                    const maxTotal = Math.max(1, ...rows.map(item => Number(item.ownSales || 0) + Number(item.teamSales || 0)))
                    return (
                      <div className="mt-5 overflow-x-auto pb-2">
                        <div className={`flex h-[310px] min-w-full items-end gap-1 border-b border-zinc-200 px-2 pt-8 ${detailMonth === 'all' ? '' : 'min-w-[720px]'}`}>
                          {rows.map(item => {
                            const own = Number(item.ownSales || 0)
                            const team = Number(item.teamSales || 0)
                            const total = own + team
                            const totalHeight = total ? Math.max(10, (total / maxTotal) * 220) : 3
                            const ownHeight = total ? (own / total) * totalHeight : 0
                            const teamHeight = total ? (team / total) * totalHeight : 0
                            return (
                              <div key={item.date} className="group flex h-full min-w-[42px] flex-1 flex-col justify-end">
                                <div className="relative flex flex-1 items-end justify-center">
                                  {total > 0 && <span className="absolute bottom-[calc(100%+6px)] whitespace-nowrap text-[9px] font-black text-zinc-700">{total} {total === 1 ? 'venda' : 'vendas'}</span>}
                                  <div className="flex w-[24px] flex-col justify-end overflow-hidden rounded-t-md" style={{ height: `${totalHeight}px` }} title={`${item.label}: ${own} da afiliada + ${team} da equipe`}>
                                    {team > 0 && <div className="w-full bg-zinc-900" style={{ height: `${teamHeight}px`, minHeight: 3 }} />}
                                    {own > 0 && <div className="w-full bg-pink-400" style={{ height: `${ownHeight}px`, minHeight: 3 }} />}
                                  </div>
                                </div>
                                <span className="mt-2 truncate text-center text-[8px] font-bold text-zinc-400">{item.label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}

                  <div className="mt-4 grid gap-2 text-xs font-bold text-zinc-500 sm:grid-cols-2">
                    <div className="rounded-xl bg-pink-50 px-3 py-2">Afiliada: <strong className="text-pink-600">{detailData.metrics?.ownSales || 0} vendas</strong> · {brl(detailData.metrics?.ownRevenue || 0)}</div>
                    <div className="rounded-xl bg-zinc-100 px-3 py-2">Equipe: <strong className="text-zinc-900">{detailData.metrics?.teamSales || 0} vendas</strong> · {brl(detailData.metrics?.teamRevenue || 0)}</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">E-mail</p>
                  <p className="mt-1 break-all font-bold text-zinc-900">{credentialsAffiliate.email || '—'}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">CPF</p>
                  <p className="mt-1 font-bold text-zinc-900">{credentialsAffiliate.cpf || '—'}</p>
                </div>
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

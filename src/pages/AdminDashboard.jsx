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


function AdminLineChart({ title, rows, series, formatValue }) {
  const width = 1080
  const height = 300
  const left = 58
  const right = 24
  const top = 36
  const bottom = 48
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const x = index => rows.length <= 1 ? left + plotWidth / 2 : left + (index / (rows.length - 1)) * plotWidth
  return (
    <div className="min-w-0 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-black text-zinc-900">{title}</h3>
        <div className="flex flex-wrap gap-3">{series.map(item => <span key={item.key} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-600"><i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}</div>
      </div>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title} className="block h-auto min-w-[720px] w-full overflow-visible">
          {[0, .25, .5, .75, 1].map(ratio => <line key={ratio} x1={left} x2={width-right} y1={top+plotHeight*(1-ratio)} y2={top+plotHeight*(1-ratio)} stroke="#f1e4eb" strokeDasharray="4 5" />)}
          {series.map(item => {
            const values = rows.map(row => Number(row[item.key] || 0))
            const minSeries = Math.min(0, ...values)
            const maxSeries = Math.max(1, ...values)
            const range = Math.max(1, maxSeries - minSeries)
            const sy = value => top + plotHeight - ((Number(value || 0) - minSeries) / range) * plotHeight
            const points = rows.map((row, index) => `${x(index)},${sy(row[item.key])}`).join(' ')
            return <g key={item.key}>
              <polyline points={points} fill="none" stroke={item.color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {rows.map((row, index) => { const px=x(index); const py=sy(row[item.key]); return <g key={row.month}><circle cx={px} cy={py} r="4" fill={item.color} stroke="white" strokeWidth="1.5"/><text x={px} y={Math.max(16,py-10)} textAnchor="middle" fontSize="10" fontWeight="700" fill={item.color}>{formatValue(row[item.key], item.key)}</text></g> })}
            </g>
          })}
          {rows.map((row,index) => <text key={row.month} x={x(index)} y={height-16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#71717a">{row.label}</text>)}
        </svg>
      </div>
    </div>
  )
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
  const responseText = await response.text().catch(() => '')
  let data = {}
  let parsedJson = false
  try {
    data = responseText ? JSON.parse(responseText) : {}
    parsedJson = Boolean(responseText)
  } catch { data = {} }
  if (!response.ok) {
    const bodyMessage = typeof data.error === 'string' ? data.error : (typeof data.message === 'string' ? data.message : '')
    const fallback = `A API ${path} respondeu HTTP ${response.status}. ${responseText && !responseText.trim().startsWith('<') ? responseText.slice(0, 180) : 'Confira se o endpoint foi publicado no último deploy.'}`
    throw new Error(bodyMessage || fallback)
  }
  if (responseText && (!parsedJson || !data || typeof data !== 'object' || Array.isArray(data))) {
    throw new Error(`A API ${path} não retornou uma resposta JSON válida. Confira o endpoint e o deploy da Vercel.`)
  }
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
  const [pushEnabledAffiliates, setPushEnabledAffiliates] = useState(0)
  const [wooviBalance, setWooviBalance] = useState(null)
  const [wooviBalanceError, setWooviBalanceError] = useState('')
  const [wooviBalanceLoading, setWooviBalanceLoading] = useState(false)
  const [wooviPixKeyCopied, setWooviPixKeyCopied] = useState(false)
  const [withdrawals, setWithdrawals] = useState([])
  const [videoSubmissions, setVideoSubmissions] = useState([])
  const [productPurchases, setProductPurchases] = useState([])
  const [productPurchaseSearch, setProductPurchaseSearch] = useState('')
  const [productPrices, setProductPrices] = useState({ hydrant: '80', stick: '100' })
  const [productTrackingLinks, setProductTrackingLinks] = useState({})
  const [productPurchaseBusy, setProductPurchaseBusy] = useState(null)
  const [selectedProductPurchaseIds, setSelectedProductPurchaseIds] = useState(new Set())
  const [melhorEnvioBusy, setMelhorEnvioBusy] = useState(false)
  const [melhorEnvioResults, setMelhorEnvioResults] = useState({})
  const [melhorEnvioCartBusy, setMelhorEnvioCartBusy] = useState(null)
  const [productPriceBusy, setProductPriceBusy] = useState(false)

  const [videoFilter, setVideoFilter] = useState('pending')
  const [videoNoteId, setVideoNoteId] = useState(null)
  const [videoNote, setVideoNote] = useState('')
  const [videoBusyId, setVideoBusyId] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false)
  const [adminGraphsOpen, setAdminGraphsOpen] = useState(false)
  const [graphYear, setGraphYear] = useState(String(new Date().getFullYear()))
  const [payingId, setPayingId] = useState(null)
  const [bulkPayingWithdrawals, setBulkPayingWithdrawals] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(null)
  const [selectedWithdrawalIds, setSelectedWithdrawalIds] = useState(new Set())
  const [togglingId, setTogglingId] = useState(null)
  const [boostGrantAffiliate, setBoostGrantAffiliate] = useState(null)
  const [boostGrantBusy, setBoostGrantBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [affiliateFilter, setAffiliateFilter] = useState('all')
  const [affiliateSearch, setAffiliateSearch] = useState('')
  const [affiliateSort, setAffiliateSort] = useState('sales_desc')
  const [detailAffiliate, setDetailAffiliate] = useState(null)
  const [detailMonth, setDetailMonth] = useState('all')
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [previewAffiliate, setPreviewAffiliate] = useState(null)
  const [previewMonth, setPreviewMonth] = useState('all')
  const [previewData, setPreviewData] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
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
  const [settingsForm, setSettingsForm] = useState({ ticketThreshold: '170', ticketBonus: '5', teamCommissionPerSale: '10', teamAdvanced1Members: '10', teamAdvanced1Sales: '20', teamAdvanced1Commission: '15', teamAdvanced2Members: '20', teamAdvanced2Sales: '40', teamAdvanced2Commission: '20', none: '30', bronze: '40', silver: '50', gold: '60', monthlyBronze: '10', monthlySilver: '50', monthlyGold: '101', fixedBronze: '100', fixedSilver: '300', fixedGold: '500', smallBoostPrice: '30', smallBoostConnections: '5', largeBoostPrice: '50', largeBoostConnections: '10', maxActiveBoosts: '3', resellerHydrant: '0', resellerHydrantBlister: '0', resellerStick: '0', resellerComplete: '0' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [savingBonusLevels, setSavingBonusLevels] = useState(false)
  const [globalStatsData, setGlobalStatsData] = useState({ all: { sales: 0, revenue: 0, averageTicket: 0, accesses: 0 }, byMonth: {}, snapshots: {} })
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonths, setSelectedMonths] = useState([])
  const [monthFilterOpen, setMonthFilterOpen] = useState(false)
  const [averageSaleCost, setAverageSaleCost] = useState('0')
  const [boostState, setBoostState] = useState({ activeCount: 0, queueCount: 0, completedCount: 0, active: [] })
  const [adminDataOpen, setAdminDataOpen] = useState(false)
  const [adminDataLoading, setAdminDataLoading] = useState(false)
  const [adminDataReady, setAdminDataReady] = useState(false)
  const [adminDataSaving, setAdminDataSaving] = useState(false)
  const [adminDataError, setAdminDataError] = useState('')
  const [adminDataNotice, setAdminDataNotice] = useState('')
  const [adminDataForm, setAdminDataForm] = useState({ loginUsername: '', loginEmail: '', notificationEmails: [''] })
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('')
  const [pushBroadcastTitle, setPushBroadcastTitle] = useState('Aviso da She Afiliadas')
  const [pushBroadcastBody, setPushBroadcastBody] = useState('')
  const [pushBroadcastBusy, setPushBroadcastBusy] = useState(false)
  const [emailBroadcastSubject, setEmailBroadcastSubject] = useState('Aviso da She Afiliadas')
  const [emailBroadcastBody, setEmailBroadcastBody] = useState('')
  const [emailBroadcastBusy, setEmailBroadcastBusy] = useState(false)
  const [broadcastLogsChannel, setBroadcastLogsChannel] = useState('')
  const [broadcastLogs, setBroadcastLogs] = useState([])
  const [broadcastLogsLoading, setBroadcastLogsLoading] = useState(false)
  const [broadcastLogsError, setBroadcastLogsError] = useState('')

  const openBroadcastLogs = async (channel) => {
    setBroadcastLogsChannel(channel)
    setBroadcastLogs([])
    setBroadcastLogsError('')
    setBroadcastLogsLoading(true)
    try {
      const result = await api(`/api/admin/withdrawals?action=broadcast-logs&channel=${channel}`)
      setBroadcastLogs(result.logs || [])
    } catch (e) { setBroadcastLogsError(e.message || 'Não foi possível carregar os registros.') }
    finally { setBroadcastLogsLoading(false) }
  }

  const sendPushBroadcast = async (event) => {
    event.preventDefault()
    if (!pushBroadcastBody.trim()) { setMessage('Escreva a mensagem do aviso.'); return }
    if (!window.confirm('Enviar esta notificação para todos os dispositivos com notificações ativas?')) return
    setPushBroadcastBusy(true)
    setMessage('')
    try {
      const result = await api('/api/admin/withdrawals', { method: 'POST', body: JSON.stringify({ action: 'push-broadcast', title: pushBroadcastTitle, body: pushBroadcastBody }) })
      setMessage(result.message || `Notificação enviada para ${result.sent || 0} dispositivo(s).`)
      setPushBroadcastBody('')
    } catch (e) { setMessage(e.message || 'Não foi possível enviar o aviso push.') }
    finally { setPushBroadcastBusy(false) }
  }

  const sendEmailBroadcast = async (event) => {
    event.preventDefault()
    if (!emailBroadcastSubject.trim() || !emailBroadcastBody.trim()) { setMessage('Preencha o assunto e a mensagem do e-mail.'); return }
    const confirmed = window.confirm(`Enviar este e-mail para todas as afiliadas cadastradas que possuem endereço de e-mail?\n\nAssunto: ${emailBroadcastSubject.trim()}\n\nEsta ação não pode ser desfeita.`)
    if (!confirmed) return
    setEmailBroadcastBusy(true)
    setMessage('')
    try {
      const result = await api('/api/admin/withdrawals', { method: 'POST', body: JSON.stringify({ action: 'email-broadcast', subject: emailBroadcastSubject, body: emailBroadcastBody }) })
      setMessage(result.message || `E-mail enviado para ${result.sent || 0} afiliada(s).`)
      setEmailBroadcastBody('')
    } catch (e) { setMessage(e.message || 'Não foi possível enviar os avisos por e-mail.') }
    finally { setEmailBroadcastBusy(false) }
  }

  const loadPanel = async () => {
    setWooviBalanceLoading(true)
    const balanceRequest = api('/api/admin/affiliates?wooviBalance=1')
      .then(data => { setWooviBalance(data.balance); setWooviBalanceError('') })
      .catch(error => { setWooviBalance(null); setWooviBalanceError(error.message || 'Não foi possível consultar o saldo Woovi.') })
      .finally(() => setWooviBalanceLoading(false))
    const [affiliateData, withdrawalData, videoData] = await Promise.all([
      api('/api/admin/affiliates'),
      api('/api/admin/withdrawals'),
      api('/api/admin/affiliates?videos=1'),
    ])
    setAffiliates(affiliateData.affiliates || [])
    setPushEnabledAffiliates(Number(affiliateData.pushEnabledAffiliates || 0))
    setWithdrawals(withdrawalData.withdrawals || [])
    setSelectedWithdrawalIds(new Set())
    setVideoSubmissions(videoData.videos || [])
    await balanceRequest
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
      teamAdvanced1Members: String(nextSettings.teamAdvanced1?.members ?? 10),
      teamAdvanced1Sales: String(nextSettings.teamAdvanced1?.sales ?? 20),
      teamAdvanced1Commission: String(nextSettings.teamAdvanced1?.commissionPerSale ?? 15),
      teamAdvanced2Members: String(nextSettings.teamAdvanced2?.members ?? 20),
      teamAdvanced2Sales: String(nextSettings.teamAdvanced2?.sales ?? 40),
      teamAdvanced2Commission: String(nextSettings.teamAdvanced2?.commissionPerSale ?? 20),
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
    if (!previewAffiliate) return
    let cancelled = false
    setPreviewLoading(true)
    setPreviewError('')
    setPreviewData(null)
    api(`/api/admin/affiliates?detail=${encodeURIComponent(previewAffiliate.id)}&month=${encodeURIComponent(previewMonth)}`)
      .then(data => { if (!cancelled) setPreviewData(data) })
      .catch(error => { if (!cancelled) setPreviewError(error.message || 'Não foi possível carregar o painel da afiliada.') })
      .finally(() => { if (!cancelled) setPreviewLoading(false) })
    return () => { cancelled = true }
  }, [previewAffiliate, previewMonth])

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

  const openAdminData = async () => {
    setAdminDataOpen(true)
    setAdminDataLoading(true)
    setAdminDataReady(false)
    setAdminDataError('')
    setAdminDataNotice('')
    setAdminNewPassword('')
    setAdminConfirmPassword('')
    try {
      const data = await api('/api/admin/data')
      const loginUsername = String(data.loginUsername || '').trim()
      const loginEmail = String(data.loginEmail || '').trim().toLowerCase()
      if (!loginUsername || !loginEmail) {
        throw new Error('A API não retornou o login e o e-mail atuais. Confira se api/[...path].js e api/_handlers/admin_data.js estão publicados e tente novamente.')
      }
      const emails = Array.isArray(data.notificationEmails) && data.notificationEmails.length
        ? data.notificationEmails
        : ['']
      const form = { loginUsername, loginEmail, notificationEmails: emails }
      setAdminDataForm(form)
      setAdminDataReady(true)
    } catch (e) {
      setAdminDataError(e.message || 'Não foi possível carregar os dados do administrador.')
    } finally {
      setAdminDataLoading(false)
    }
  }

  const saveAdminData = async (event) => {
    event.preventDefault()
    setAdminDataSaving(true)
    setAdminDataError('')
    setAdminDataNotice('')
    try {
      if (!adminDataReady) throw new Error('Os dados atuais do administrador não foram carregados. Feche e abra Dados novamente ou tente recarregar.');
      const notificationEmails = [...new Set(adminDataForm.notificationEmails.map(value => String(value || '').trim().toLowerCase()).filter(Boolean))]
      if (!adminDataForm.loginUsername.trim() || !adminDataForm.loginEmail.trim()) {
        throw new Error('Preencha o login e o e-mail de login.')
      }
      if (!notificationEmails.length) throw new Error('Adicione pelo menos um e-mail de notificação.')
      if (notificationEmails.length > 20) throw new Error('Você pode cadastrar até 20 e-mails de notificação.')
      if (adminNewPassword && adminNewPassword.length < 10) throw new Error('A nova senha deve ter pelo menos 10 caracteres.')
      if (adminNewPassword !== adminConfirmPassword) throw new Error('A confirmação da nova senha não confere.')
      const data = await api('/api/admin/data', {
        method: 'PATCH',
        body: JSON.stringify({
          loginUsername: adminDataForm.loginUsername.trim(),
          loginEmail: adminDataForm.loginEmail.trim().toLowerCase(),
          notificationEmails,
          newPassword: adminNewPassword,
        }),
      })
      const form = {
        loginUsername: data.loginUsername,
        loginEmail: data.loginEmail,
        notificationEmails: data.notificationEmails?.length ? data.notificationEmails : [''],
      }
      setAdminDataForm(form)
      setAdminNewPassword('')
      setAdminConfirmPassword('')
      setAdminDataNotice(data.passwordChanged ? 'Dados salvos. A senha do administrador também foi alterada; use a nova senha no próximo login.' : 'Dados do administrador salvos com sucesso.')
      setMessage('Dados do administrador atualizados.')
    } catch (e) {
      setAdminDataError(e.message || 'Não foi possível salvar os dados do administrador.')
    } finally {
      setAdminDataSaving(false)
    }
  }


  const grantTeamBoost = async (connections) => {
    if (!boostGrantAffiliate || ![5, 10].includes(Number(connections))) return
    const affiliate = boostGrantAffiliate
    setBoostGrantBusy(true)
    setMessage('')
    try {
      const result = await api('/api/admin/affiliates', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'grant_team_boost', id: affiliate.id, connections: Number(connections) }),
      })
      setBoostGrantAffiliate(null)
      setMessage(`${affiliate.name}: impulso gratuito de ${Number(connections)} conexões ${result.status === 'queued' ? 'adicionado à fila' : 'ativado'}.`)
      await loadPanel()
    } catch (error) {
      setMessage(error.message || 'Não foi possível conceder o impulso gratuito.')
    } finally {
      setBoostGrantBusy(false)
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
      setMessage(result.message || 'Solicitação aprovada e enviada à Woovi para pagamento via Pix.')
    } catch (e) {
      setMessage(e.message || 'Não foi possível processar o saque.')
    } finally {
      setPayingId(null)
    }
  }

  const toggleWithdrawalSelection = (withdrawalId) => {
    const key = String(withdrawalId)
    setSelectedWithdrawalIds(current => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAllVisibleWithdrawals = () => {
    setSelectedWithdrawalIds(current => {
      const next = new Set(current)
      const visibleIds = selectableWithdrawals.map(withdrawal => String(withdrawal.id))
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => next.has(id))
      visibleIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  const approveSelectedWithdrawals = async () => {
    const selected = selectableWithdrawals.filter(withdrawal => selectedWithdrawalIds.has(String(withdrawal.id)))
    if (!selected.length || bulkPayingWithdrawals) return

    const total = selected.reduce((sum, withdrawal) => sum + Number(withdrawal.amount || 0), 0)
    const preview = selected.slice(0, 8).map(withdrawal => `• ${withdrawal.affiliates?.name || 'Afiliada'} — ${brl(withdrawal.amount)} (saque #${withdrawal.id})`).join('\n')
    const more = selected.length > 8 ? `\n… e mais ${selected.length - 8} solicitação(ões).` : ''
    const confirmed = window.confirm(
      `Você selecionou ${selected.length} solicitação(ões), totalizando ${brl(total)}.\n\n${preview}${more}\n\nA operação enviará cada solicitação à Woovi uma por vez, para transferir Pix reais às chaves cadastradas. Se alguma falhar ou ficar em processamento, não será reenviada automaticamente. Deseja continuar?`
    )
    if (!confirmed) return

    setBulkPayingWithdrawals(true)
    setBulkProgress({ current: 0, total: selected.length })
    setMessage('')
    const succeeded = []
    const failed = []
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const withdrawal = selected[index]
        setBulkProgress({ current: index + 1, total: selected.length })
        setMessage(`Processando solicitação ${index + 1} de ${selected.length} — saque #${withdrawal.id}…`)
        try {
          const result = await api('/api/admin/withdrawals', {
            method: 'PATCH',
            body: JSON.stringify({ id: withdrawal.id, action: 'approve' }),
          })
          const resultStatus = String(result.withdrawal?.status || 'processing').toLowerCase()
          if (resultStatus === 'failed') {
            failed.push({ withdrawal, message: result.message || result.withdrawal?.woovi_fail_reason || 'A Woovi recusou o pagamento.' })
          } else {
            succeeded.push({ withdrawal, status: resultStatus, message: result.message || '' })
          }
        } catch (error) {
          failed.push({ withdrawal, message: error.message || 'Erro desconhecido.' })
        }
      }

      await loadPanel()
      setSelectedWithdrawalIds(new Set())

      const paidCount = succeeded.filter(item => item.status === 'paid').length
      const waitingCount = succeeded.length - paidCount
      const succeededValue = succeeded.reduce((sum, item) => sum + Number(item.withdrawal.amount || 0), 0)
      const failedDetails = failed.slice(0, 4).map(item => `#${item.withdrawal.id}: ${item.message}`).join(' | ')
      let summary = `Lote concluído: ${paidCount} pago(s) confirmado(s), ${waitingCount} solicitação(ões) enviada(s)/aguardando confirmação (${brl(succeededValue)} no total) e ${failed.length} falha(s). Confira os status finais no painel e na Woovi.`
      if (failedDetails) summary += ` Detalhes: ${failedDetails}${failed.length > 4 ? ` | e mais ${failed.length - 4} falha(s)` : ''}`
      setMessage(summary)
    } catch (error) {
      setMessage(error.message || 'O processamento em lote terminou, mas não foi possível atualizar o painel. Atualize a página e confira cada saque antes de tentar novamente.')
    } finally {
      setBulkPayingWithdrawals(false)
      setBulkProgress(null)
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
        teamAdvanced1: { members: Number(settingsForm.teamAdvanced1Members), sales: Number(settingsForm.teamAdvanced1Sales), commissionPerSale: Number(String(settingsForm.teamAdvanced1Commission).replace(',', '.')) },
        teamAdvanced2: { members: Number(settingsForm.teamAdvanced2Members), sales: Number(settingsForm.teamAdvanced2Sales), commissionPerSale: Number(String(settingsForm.teamAdvanced2Commission).replace(',', '.')) },
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
      if (!Number.isFinite(payload.ticketThreshold) || payload.ticketThreshold <= 0 || !Number.isFinite(payload.ticketBonus) || payload.ticketBonus < 0 || !Number.isFinite(payload.teamCommissionPerSale) || payload.teamCommissionPerSale < 0 || [payload.teamAdvanced1, payload.teamAdvanced2].some(t => !Number.isInteger(t.members) || t.members <= 0 || !Number.isInteger(t.sales) || t.sales <= 0 || !Number.isFinite(t.commissionPerSale) || t.commissionPerSale < 0) || Object.values(payload.commissions).some(value => !Number.isFinite(value) || value < 0) || Object.values(payload.monthlyLevels).some(value => !Number.isInteger(value) || value <= 0) || Object.values(payload.fixedLevels).some(value => !Number.isInteger(value) || value <= 0) || Object.values(payload.resellerPrices).some(value => !Number.isFinite(value) || value < 0) || payload.boostPlans.small.price <= 0 || !Number.isInteger(payload.boostPlans.small.connections) || payload.boostPlans.small.connections <= 0 || payload.boostPlans.large.price <= 0 || !Number.isInteger(payload.boostPlans.large.connections) || payload.boostPlans.large.connections <= 0 || !Number.isInteger(payload.boostPlans.maxActive) || payload.boostPlans.maxActive <= 0 || !(payload.monthlyLevels.bronze < payload.monthlyLevels.silver && payload.monthlyLevels.silver < payload.monthlyLevels.gold) || !(payload.fixedLevels.bronze < payload.fixedLevels.silver && payload.fixedLevels.silver < payload.fixedLevels.gold)) {
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
        teamAdvanced1Members: String(result.settings.teamAdvanced1?.members ?? 10),
        teamAdvanced1Sales: String(result.settings.teamAdvanced1?.sales ?? 20),
        teamAdvanced1Commission: String(result.settings.teamAdvanced1?.commissionPerSale ?? 15),
        teamAdvanced2Members: String(result.settings.teamAdvanced2?.members ?? 20),
        teamAdvanced2Sales: String(result.settings.teamAdvanced2?.sales ?? 40),
        teamAdvanced2Commission: String(result.settings.teamAdvanced2?.commissionPerSale ?? 20),
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

  const loadProductPurchases = async () => {
    try {
      const data = await api('/api/admin/product-purchases?admin=1')
      setProductPurchases(data.purchases || [])
      setProductPrices({ hydrant: String(data.prices?.hydrant ?? 80), stick: String(data.prices?.stick ?? 100) })
    } catch (e) { setMessage(e.message || 'Não foi possível carregar Compras Afiliadas.') }
  }

  const saveProductPrices = async (event) => {
    event.preventDefault()
    setProductPriceBusy(true)
    try {
      const data = await api('/api/admin/product-purchases?admin=1', { method: 'POST', body: JSON.stringify({ action: 'set_prices', hydrant: Number(productPrices.hydrant), stick: Number(productPrices.stick) }) })
      setProductPrices({ hydrant: String(data.prices.hydrant), stick: String(data.prices.stick) })
      setMessage('Preços dos produtos para afiliadas atualizados.')
      await loadProductPurchases()
    } catch (e) { setMessage(e.message || 'Não foi possível salvar os preços.') }
    finally { setProductPriceBusy(false) }
  }

  const updateProductPurchase = async (purchase, status) => {
    const trackingUrl = String(productTrackingLinks[purchase.id] || purchase.tracking_url || '').trim()
    if (status === 'shipped' && !/^https?:\/\//i.test(trackingUrl)) {
      setMessage('Informe um link de rastreio válido começando com http:// ou https:// antes de marcar como enviado.')
      return
    }
    if (status === 'rejected') {
      const confirmed = window.confirm(`Confirma recusar a compra #${purchase.id} (${purchase.product === 'hydrant' ? 'Hidratante' : 'Stick'}) de ${brl(purchase.price)}? A reserva do saldo será liberada para a afiliada.`)
      if (!confirmed) return
    }
    setProductPurchaseBusy(purchase.id)
    try {
      await api('/api/admin/product-purchases?admin=1', { method: 'PATCH', body: JSON.stringify({ id: purchase.id, status, ...(status === 'shipped' ? { tracking_url: trackingUrl } : {}) }) })
      if (status === 'shipped') setProductTrackingLinks(current => ({ ...current, [purchase.id]: trackingUrl }))
      await loadProductPurchases()
      setMessage(status === 'approved' ? 'Compra aprovada e saldo abatido definitivamente.' : status === 'shipped' ? 'Compra marcada como enviada.' : 'Solicitação recusada; a reserva de saldo foi liberada.')
    } catch (e) { setMessage(e.message || 'Não foi possível atualizar a compra.') }
    finally { setProductPurchaseBusy(null) }
  }

  const syncProductPurchaseTracking = async (purchase) => {
    setProductPurchaseBusy(purchase.id)
    setMessage(`Consultando rastreio da solicitação #${purchase.id} no Melhor Envio…`)
    try {
      const data = await api('/api/admin/product-purchases?admin=1', { method: 'POST', body: JSON.stringify({ action: 'melhor_envio_sync_tracking', id: purchase.id }) })
      await loadProductPurchases()
      if (data.purchase?.tracking_url) {
        setProductTrackingLinks(current => ({ ...current, [purchase.id]: data.purchase.tracking_url }))
        setMessage(`Rastreio encontrado${data.purchase.melhor_envio_tracking_code ? `: ${data.purchase.melhor_envio_tracking_code}` : ''}. O link foi salvo e já pode ser enviado à afiliada ao marcar como enviado.`)
      } else {
        const attempts = (data.sync?.attempts || []).map(item => `${item.endpoint}: ${item.ok ? 'consultado' : `HTTP ${item.status || 'erro'}`}`).join(' · ')
        setMessage(`${data.message || 'Rastreio ainda não localizado.'}${attempts ? ` Diagnóstico: ${attempts}.` : ''}`)
      }
    } catch (e) {
      setMessage(e.message || 'Não foi possível consultar o rastreio no Melhor Envio.')
    } finally { setProductPurchaseBusy(null) }
  }

  const eligibleMelhorEnvioPurchases = productPurchases.filter(p => p.status === 'pending' && p.freight_paid === true && !p.tracking_url && !p.melhor_envio_shipment_id)
  const toggleProductPurchaseSelection = (id) => setSelectedProductPurchaseIds(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })
  const toggleAllProductPurchases = () => setSelectedProductPurchaseIds(current => {
    const eligibleIds = eligibleMelhorEnvioPurchases.map(p => p.id)
    return eligibleIds.length && eligibleIds.every(id => current.has(id))
      ? new Set([...current].filter(id => !eligibleIds.includes(id)))
      : new Set([...current, ...eligibleIds])
  })
  const quoteSelectedWithMelhorEnvio = async () => {
    const ids = [...selectedProductPurchaseIds].filter(id => eligibleMelhorEnvioPurchases.some(p => p.id === id))
    if (!ids.length) { setMessage('Selecione solicitações pendentes com frete aprovado para cotar no Melhor Envio.'); return }
    setMelhorEnvioBusy(true)
    setMessage('Cotando pedidos selecionados no Melhor Envio…')
    try {
      const data = await api('/api/admin/product-purchases?admin=1', { method: 'POST', body: JSON.stringify({ action: 'melhor_envio_quote_batch', ids }) })
      const results = Object.fromEntries((data.results || []).map(result => [result.id, result]))
      setMelhorEnvioResults(current => ({ ...current, ...results }))
      setSelectedProductPurchaseIds(new Set())
      await loadProductPurchases()
      const ok = (data.results || []).filter(result => result.ok).length
      const failed = (data.results || []).length - ok
      setMessage(`Melhor Envio: ${ok} pedido(s) cotado(s), ${failed} com pendência. Confira as opções em cada solicitação.`)
    } catch (e) { setMessage(e.message || 'Não foi possível cotar os pedidos no Melhor Envio.') }
    finally { setMelhorEnvioBusy(false) }
  }

  const addMelhorEnvioQuoteToCart = async (purchase, quote) => {
    const serviceId = Number(quote?.id ?? quote?.service_id ?? quote?.service?.id)
    if (!serviceId) { setMessage('Esta cotação não tem um ID de serviço válido. Faça uma nova cotação.'); return }
    if (!window.confirm(`Adicionar a etiqueta da solicitação #${purchase.id} ao carrinho do Melhor Envio? A compra e o pagamento continuarão sendo feitos por você no site do Melhor Envio.`)) return
    setMelhorEnvioCartBusy(purchase.id)
    try {
      const data = await api('/api/admin/product-purchases?admin=1', { method: 'POST', body: JSON.stringify({ action: 'melhor_envio_add_cart', id: purchase.id, service_id: serviceId }) })
      setMessage(data.message || `Solicitação #${purchase.id} adicionada ao carrinho do Melhor Envio.`)
      await loadProductPurchases()
    } catch (e) { setMessage(e.message || 'Não foi possível adicionar a etiqueta ao carrinho do Melhor Envio.') }
    finally { setMelhorEnvioCartBusy(null) }
  }

  const exportPendingProductPurchasesCsv = () => {
    const pending = productPurchases.filter(p => p.status === 'pending' && p.freight_paid === true)
    if (!pending.length) {
      setMessage('Não há compras aguardando envio com frete aprovado para exportar.')
      return
    }
    const parseAddress = (p) => {
      const out = {
        street: p.street || '', number: p.house_number || '', complement: p.complement || '',
        neighborhood: p.neighborhood || '', city: p.city || '', state: p.state || '', postal_code: String(p.cep || '').replace(/\D/g, ''),
      }
      // Compatibilidade com solicitações antigas, que salvaram o endereço em uma única string.
      if (!out.street && p.address) {
        const parts = String(p.address).split(',').map(v => v.trim()).filter(Boolean)
        out.street = parts[0] || ''
        const numberPart = parts.find(v => /^n[ºo.]?\s*/i.test(v))
        if (!out.number && numberPart) out.number = numberPart.replace(/^n[ºo.]?\s*/i, '').trim()
        const cepPart = parts.find(v => /CEP/i.test(v))
        if (!out.postal_code && cepPart) out.postal_code = cepPart.replace(/\D/g, '')
        const cityState = parts.find(v => / - [A-Z]{2}$/.test(v))
        if (!out.city && cityState) {
          const m = cityState.match(/^(.*?)\s+-\s+([A-Z]{2})$/)
          if (m) { out.city = m[1].trim(); out.state = m[2].trim() }
        }
        if (!out.neighborhood) {
          const beforeCity = cityState ? parts.indexOf(cityState) - 1 : -1
          if (beforeCity >= 0) out.neighborhood = parts[beforeCity]
        }
        if (!out.complement) {
          const reserved = new Set([parts[0], numberPart, cepPart, cityState, out.neighborhood].filter(Boolean))
          const other = parts.find(v => !reserved.has(v))
          if (other) out.complement = other
        }
      }
      return out
    }
    const headers = ['reference', 'recipient_name', 'recipient_phone', 'recipient_email', 'recipient_document', 'recipient_postal_code', 'recipient_address', 'recipient_number', 'recipient_complement', 'recipient_district', 'recipient_city', 'recipient_state', 'product']
    const quote = value => `"${String(value ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`
    const rows = pending.map(p => {
      const a = parseAddress(p)
      return [
        `SHE-AF-${p.id}`, p.full_name, p.phone, p.email, String(p.cpf || '').replace(/\D/g, ''), a.postal_code,
        a.street, a.number, a.complement, a.neighborhood, a.city, a.state,
        p.product === 'hydrant' ? 'Hidratante Íntimo She' : 'Stick Clareador She',
      ].map(quote).join(',')
    })
    const csv = '\uFEFF' + [headers.map(quote).join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `she-afiliadas-aguardando-envio-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    setMessage(`CSV gerado com ${pending.length} solicitação(ões) aguardando envio. Pedidos já marcados como enviados foram excluídos.`)
  }

  useEffect(() => {
    if (authenticated) loadProductPurchases()
  }, [authenticated])

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
      totalBalance: affiliates.reduce((sum, affiliate) => sum + Number(affiliate.balance || 0) + Number(affiliate.teamBalance || 0), 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    }
  }, [affiliates, withdrawals, globalStatsData, selectedMonths])

  const parsedAverageSaleCost = Math.max(0, Number(String(averageSaleCost).replace(',', '.')) || 0)
  const graphYears = [...new Set(Object.keys(globalStatsData.byMonth || {}).map(month => month.slice(0, 4)).filter(year => /^\d{4}$/.test(year)))].sort((a, b) => b.localeCompare(a))
  const graphMonths = Array.from({ length: 12 }, (_, index) => {
    const month = `${graphYear}-${String(index + 1).padStart(2, '0')}`
    const value = globalStatsData.byMonth?.[month] || {}
    const sales = Number(value.sales || 0)
    const revenue = Number(value.revenue || 0)
    const averageTicket = sales ? revenue / sales : 0
    const averageCommission = sales ? (Number(value.personalCommission || 0) + Number(value.teamCommission || 0)) / sales : 0
    const totalCommission = Number(value.personalCommission || 0) + Number(value.teamCommission || 0)
    return { month, label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', ''), sales, revenue, margin: revenue - (sales * parsedAverageSaleCost) - totalCommission, averageTicket, averageCommission }
  })
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
      if (affiliateSort === 'active_desc') return Number(Boolean(b.adminActive)) - Number(Boolean(a.adminActive)) || nameCompare
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

  const selectableWithdrawals = orderedWithdrawals.filter(item => item.status === 'pending' || item.status === 'approved')
  const selectedVisibleWithdrawals = selectableWithdrawals.filter(item => selectedWithdrawalIds.has(String(item.id)))
  const allSelectableWithdrawalsSelected = selectableWithdrawals.length > 0 && selectedVisibleWithdrawals.length === selectableWithdrawals.length
  const selectedWithdrawalTotal = selectedVisibleWithdrawals.reduce((sum, item) => sum + Number(item.amount || 0), 0)

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
        <nav aria-label="Navegação do painel administrativo" className="sticky top-0 z-40 -mx-2 mb-6 rounded-2xl border border-white/70 bg-white/65 px-3 py-3 shadow-[0_8px_32px_rgba(236,72,153,.10)] backdrop-blur-xl md:mx-0 md:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <a href="#admin-indicadores" aria-label="She Painel - início" className="flex shrink-0 items-center gap-2 rounded-xl px-1 py-1 text-zinc-950 no-underline">
              <span className="text-xl font-black tracking-[-.09em]">SHE<span className="text-pink-500">.</span></span>
              <span className="border-l border-pink-200 pl-2 text-[10px] font-black uppercase tracking-[.12em] text-zinc-500 sm:text-xs">PAINEL - AFILIADAS</span>
            </a>
            <div className="ml-auto flex min-w-0 items-center gap-2">
              {message && <span className="hidden max-w-48 truncate text-xs font-semibold text-zinc-500 lg:inline">{message}</span>}
            <div className="relative">
              <button type="button" aria-haspopup="menu" aria-expanded={adminMenuOpen} onClick={() => setAdminMenuOpen(open => !open)} className="inline-flex items-center gap-2 rounded-xl border border-pink-200/80 bg-white/70 px-3 py-2.5 text-xs font-black text-zinc-700 shadow-sm transition hover:bg-pink-50 hover:text-pink-700">
                <span className="text-pink-500" aria-hidden="true"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg></span>
                Menu <span aria-hidden="true" className={`text-pink-500 transition-transform ${adminMenuOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>
              {adminMenuOpen && <>
                <button type="button" aria-label="Fechar menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setAdminMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-pink-100/90 bg-white/95 p-2 shadow-[0_16px_45px_rgba(30,10,20,.18)] backdrop-blur-xl">
                  {[
                    ['grid', 'Indicadores', 'admin-indicadores'],
                    ['wallet', 'Saldo', 'admin-saque'],
                    ['users', 'Afiliadas Cadastradas', 'admin-afiliadas'],
                    ['bell', 'Avisos por Push', 'admin-push'],
                    ['mail', 'Avisos por Email', 'admin-email'],
                    ['settings', 'Metas e Comissões', 'admin-configuracoes'],
                    ['shop', 'Revenda', 'admin-revenda'],
                    ['zap', 'Impulso', 'admin-impulso'],
                    ['video', 'Solicitação de Vídeo', 'admin-videos'],
                    ['wallet', 'Solicitação de Saque', 'admin-saques'],
                    ['package', 'Solicitação de Compra', 'admin-compras'],
                  ].map(([icon, label, target]) => <a key={target} role="menuitem" href={`#${target}`} onClick={() => setAdminMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 no-underline transition hover:bg-pink-50 hover:text-pink-700 focus:bg-pink-50 focus:outline-none">
                    <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-500">
                      {icon === 'grid' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
                      : icon === 'users' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1"/></svg>
                      : icon === 'bell' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
                      : icon === 'mail' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>
                      : icon === 'settings' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2.9-1.2 2.1-1.4-.5a8 8 0 0 1-1.7 1l-.2 1.5h-2.4l-.3-1.5a8 8 0 0 1-1.7-1l-1.4.5-1.2-2.1 1.2-.9a7 7 0 0 1 0-2l-1.2-.9 1.2-2.1 1.4.5a8 8 0 0 1 1.7-1l.3-1.5h2.4l.2 1.5a8 8 0 0 1 1.7 1l1.4-.5 1.2 2.1-1.2.9a7 7 0 0 1 0 2Z" transform="translate(-1 -1)"/></svg>
                      : icon === 'shop' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9h18l-2-5H5L3 9Z"/><path d="M5 9v11h14V9M9 20v-7h6v7"/></svg>
                      : icon === 'zap' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"/></svg>
                      : icon === 'video' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="13" height="14" rx="3"/><path d="m16 10 5-3v10l-5-3z"/></svg>
                      : icon === 'wallet' ? <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 9V6a3 3 0 0 1 3-3h12M15 13h6"/></svg>
                      : <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h18l-2 13H5L3 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/></svg>}
                    </span><span>{label}</span>
                  </a>)}
                  <button type="button" role="menuitem" onClick={() => { setAdminMenuOpen(false); setAdminGraphsOpen(true) }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 transition hover:bg-pink-50 hover:text-pink-700 focus:bg-pink-50 focus:outline-none">
                    <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-500"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/><circle cx="7" cy="14" r="1"/><circle cx="11" cy="10" r="1"/><circle cx="14" cy="13" r="1"/><circle cx="20" cy="6" r="1"/></svg></span>Gráficos
                  </button>
                  <div className="my-1 h-px bg-pink-100" />
                  <a role="menuitem" href="/admin/produtos" onClick={() => setAdminMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 no-underline transition hover:bg-pink-50 hover:text-pink-700 focus:bg-pink-50 focus:outline-none">
                    <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center text-pink-500"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h5M8 16h8"/><path d="M17 11v5m-2.5-2.5h5"/></svg></span>Produtos e Upsell
                  </a>
                  <a role="menuitem" href="/admin/trafego-pago" onClick={() => setAdminMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 no-underline transition hover:bg-pink-50 hover:text-pink-700 focus:bg-pink-50 focus:outline-none"><span className="flex h-5 w-5 items-center justify-center text-pink-500"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></svg></span>Meta Ads</a>
                  <a role="menuitem" href="/admin/negocio" onClick={() => setAdminMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-zinc-700 no-underline transition hover:bg-pink-50 hover:text-pink-700 focus:bg-pink-50 focus:outline-none"><span className="flex h-5 w-5 items-center justify-center text-pink-500"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="15" rx="2"/><path d="M7 9h10M7 13h4M7 17h7"/></svg></span>Gestão do Negócio</a>
                </div>
              </>}
            </div>
              <button onClick={refresh} disabled={refreshing} className="shrink-0 rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-pink-600 disabled:opacity-60 sm:text-sm">{refreshing ? 'Atualizando…' : 'Atualizar'}</button>
            </div>
          </div>
        </nav>

        {adminGraphsOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-zinc-950/45 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setAdminGraphsOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby="admin-graphs-title" className="my-4 w-full max-w-7xl rounded-3xl border border-pink-100 bg-[#fffafd] p-4 shadow-2xl sm:my-8 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Análise do programa</p><h2 id="admin-graphs-title" className="mt-1 text-2xl font-black text-zinc-950">Gráficos</h2><p className="mt-1 text-sm text-zinc-500">Evolução mensal de vendas, faturamento e indicadores financeiros.</p></div>
              <div className="flex items-center gap-2"><label htmlFor="admin-graphs-year" className="text-xs font-bold text-zinc-600">Ano</label><select id="admin-graphs-year" value={graphYear} onChange={event => setGraphYear(event.target.value)} className="rounded-xl border border-pink-200 bg-white px-3 py-2 text-sm font-bold text-zinc-800">{[...new Set([String(new Date().getFullYear()), ...graphYears])].sort((a,b)=>b.localeCompare(a)).map(year => <option key={year} value={year}>{year}</option>)}</select><button type="button" onClick={() => setAdminGraphsOpen(false)} aria-label="Fechar gráficos" className="ml-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-black text-zinc-600 hover:bg-zinc-100">✕</button></div>
            </div>
            <div className="grid gap-4">
              <AdminLineChart title="Vendas totais e faturamento por mês" rows={graphMonths} series={[{key:'sales',label:'Vendas',color:'#ec4899'},{key:'revenue',label:'Faturamento',color:'#27272a'}]} formatValue={(value,key) => key === 'revenue' ? brl(value) : String(Math.round(Number(value || 0)))} />
              <AdminLineChart title="Margem de contribuição por mês" rows={graphMonths} series={[{key:'margin',label:'Margem total estimada',color:'#db2777'}]} formatValue={value => brl(value)} />
              <AdminLineChart title="Ticket médio por mês" rows={graphMonths} series={[{key:'averageTicket',label:'Ticket médio',color:'#7c3aed'}]} formatValue={value => brl(value)} />
              <AdminLineChart title="Comissão média por mês" rows={graphMonths} series={[{key:'averageCommission',label:'Comissão média',color:'#0891b2'}]} formatValue={value => brl(value)} />
            </div>
            <p className="mt-4 text-xs text-zinc-500">A margem total é estimada por mês: faturamento − (vendas × custo médio por venda configurado) − comissões totais. Os rótulos mostram o valor de cada mês.</p>
          </section>
        </div>}

        <section id="admin-indicadores" className="mt-7 scroll-mt-28">
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
              ['Conversão', `${stats.totalAccesses > 0 ? ((stats.totalSales / stats.totalAccesses) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) : '0,00'}%`],
              [selectedMonths.length ? 'Faturamento no período' : 'Faturamento acumulado', brl(stats.totalRevenue)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
                {label === 'Saldo das afiliadas' && (
                  <p className="mt-1 text-xs text-zinc-400">Saldo total Pessoal + Equipes</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">Ticket médio</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">{brl(stats.averageTicket)}</p>
            </div>
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

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Afiliadas', stats.affiliates],
              ['Ativas', stats.active],
              ['Inativas', stats.inactive],
              ['Saldo das afiliadas', brl(stats.totalBalance)],
            ].map(([label, value]) => (
              <div
                key={label}
                id={label === 'Afiliadas' ? 'admin-saque' : undefined}
                className={`scroll-mt-28 rounded-[1.5rem] border p-5 shadow-sm ${label === 'Saldo das afiliadas' ? 'border-pink-200 bg-pink-50/80' : 'border-pink-100 bg-white'}`}
              >
                <p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-400">{label}</p>
                <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
                {label === 'Saldo das afiliadas' && (
                  <p className="mt-1 text-xs font-medium text-pink-700/80">Saldo total Afiliadas + Equipes</p>
                )}
              </div>
            ))}
            <div className={`rounded-[1.5rem] border p-5 shadow-sm ${!wooviBalance ? 'border-zinc-200 bg-zinc-50/70' : wooviBalance.available < stats.totalBalance ? 'border-red-200 bg-red-50/70' : 'border-emerald-200 bg-emerald-50/70'}`}>
              <p className={`text-[10px] font-black uppercase tracking-[.18em] ${!wooviBalance ? 'text-zinc-500' : wooviBalance.available < stats.totalBalance ? 'text-red-700' : 'text-emerald-700'}`}>Saldo Woovi</p>
              <p className="mt-2 text-2xl font-black text-zinc-950">
                {wooviBalanceLoading ? 'Consultando…' : wooviBalance ? brl(wooviBalance.available) : 'Indisponível'}
              </p>
              {!wooviBalance && wooviBalanceError && (
                <p className="mt-1 text-xs font-medium text-zinc-500">{wooviBalanceError}</p>
              )}
              <button
                type="button"
                onClick={async () => {
                  const pixKey = 'b2145008-648c-460c-a31b-cb022db8b669'
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(pixKey)
                    } else {
                      const field = document.createElement('textarea')
                      field.value = pixKey
                      field.setAttribute('readonly', '')
                      field.style.position = 'fixed'
                      field.style.opacity = '0'
                      document.body.appendChild(field)
                      field.select()
                      const copied = document.execCommand('copy')
                      field.remove()
                      if (!copied) throw new Error('Não foi possível copiar a chave Pix.')
                    }
                    setWooviPixKeyCopied(true)
                    window.setTimeout(() => setWooviPixKeyCopied(false), 1800)
                  } catch {
                    setMessage('Não foi possível copiar a chave Pix. Verifique a permissão de área de transferência do navegador.')
                  }
                }}
                title="Copiar chave Pix da Woovi"
                aria-label="Copiar chave Pix da Woovi"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 shadow-sm transition hover:border-pink-300 hover:bg-pink-50"
              >
                {wooviPixKeyCopied ? (
                  <><svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.26a1 1 0 0 1-1.42.003L3.29 9.202a1 1 0 1 1 1.415-1.414l4.08 4.08 6.493-6.572a1 1 0 0 1 1.426-.006Z" clipRule="evenodd" /></svg>Copiado!</>
                ) : (
                  <><svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden="true"><path d="M6 2.75A1.75 1.75 0 0 1 7.75 1h8.5A1.75 1.75 0 0 1 18 2.75v10.5A1.75 1.75 0 0 1 16.25 15h-8.5A1.75 1.75 0 0 1 6 13.25V2.75Z"/><path d="M3.75 5A1.75 1.75 0 0 0 2 6.75v10.5A1.75 1.75 0 0 0 3.75 19h8.5A1.75 1.75 0 0 0 14 17.25V17H7.75A3.75 3.75 0 0 1 4 13.25V5h-.25Z"/></svg>Copiar chave Pix</>
                )}
              </button>
            </div>
          </div>
        </section>

        <section id="admin-afiliadas" className="mt-6 scroll-mt-28 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
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
                  <option value="active_desc">Ativas primeiro</option>
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
                  <th className="pb-3 pr-4">Saldo pessoal</th>
                  <th className="pb-3 pr-4">Saldo de equipe</th>
                  <th className="pb-3 pr-4">ID</th>
                  <th className="pb-3 pr-4">Data de entrada</th>
                  <th className="pb-3 pr-4">Ativa/Inativa</th>
                  <th className="pb-3 pr-4">Sem vendas</th>
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
                    <td className="py-4 pr-4 font-black text-emerald-600">{brl(Number(affiliate.balance || 0))}</td>
                    <td className="py-4 pr-4 font-black text-violet-600">{brl(Number(affiliate.teamBalance || 0))}</td>
                    <td className="py-4 pr-4 font-bold text-zinc-600">{affiliate.id}</td>
                    <td className="py-4 pr-4 font-bold text-zinc-700">{affiliate.created_at ? new Date(affiliate.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBoostGrantAffiliate(affiliate)}
                          title={`Conceder impulso gratuito para ${affiliate.name}`}
                          className="rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1.5 text-[10px] font-black text-pink-700 transition hover:border-pink-400 hover:bg-pink-100"
                        >
                          Impulso
                        </button>
                      <span
                        role="status"
                        aria-label={`Status de ${affiliate.name}: ${affiliate.adminActive ? 'ativa' : 'inativa'}`}
                        className={`inline-flex min-w-[76px] items-center justify-center rounded-xl border px-3 py-1.5 text-[10px] font-black tracking-[.08em] shadow-sm backdrop-blur-md ${affiliate.adminActive
                          ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-800 shadow-emerald-200/40'
                          : 'border-rose-300/70 bg-rose-400/20 text-rose-800 shadow-rose-200/40'}`}
                      >
                        {affiliate.adminActive ? 'ATIVA' : 'INATIVA'}
                      </span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${!affiliate.lastSaleAt ? 'bg-zinc-100 text-zinc-600' : Number(affiliate.daysWithoutSales || 0) >= 60 ? 'bg-red-100 text-red-800 ring-1 ring-red-300' : Number(affiliate.daysWithoutSales || 0) >= 7 ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'}`}>
                        {!affiliate.lastSaleAt ? 'Não possui venda' : `${Number(affiliate.daysWithoutSales || 0)} ${Number(affiliate.daysWithoutSales || 0) === 1 ? 'dia' : 'dias'} sem vendas`}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setCredentialsAffiliate(affiliate); setNewPassword('') }}
                          className="whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:border-pink-300 hover:text-pink-600"
                        >
                          Ver dados
                        </button>
                        <button
                          type="button"
                          onClick={() => { window.open(`/afiliado?adminPreviewId=${encodeURIComponent(affiliate.id)}`, '_blank', 'noopener,noreferrer') }}
                          aria-label={`Visualizar painel de ${affiliate.name}`}
                          title={`Visualizar painel de ${affiliate.name}`}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-pink-200 bg-pink-50 text-pink-700 transition hover:border-pink-400 hover:bg-pink-100"
                        >
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                      </div>
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






        {broadcastLogsChannel && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/55 p-3 backdrop-blur-sm sm:p-6" onMouseDown={event => { if (event.target === event.currentTarget) setBroadcastLogsChannel('') }}>
            <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-[1.5rem] border border-pink-100 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-3 border-b border-pink-100 bg-gradient-to-r from-pink-50 to-white p-5 sm:p-6">
                <div><p className="text-xs font-black uppercase tracking-[.16em] text-pink-600">She Afiliadas · Histórico</p><h2 className="mt-1 text-xl font-black text-zinc-950">Registros de avisos por {broadcastLogsChannel === 'push' ? 'push' : 'e-mail'}</h2><p className="mt-1 text-sm text-zinc-500">Lista dos avisos enviados e a data e hora de cada envio.</p></div>
                <button type="button" aria-label="Fechar registros" onClick={() => setBroadcastLogsChannel('')} className="rounded-full bg-white px-3 py-1 text-2xl font-bold text-zinc-500 shadow-sm">×</button>
              </div>
              <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6">
                {broadcastLogsLoading ? <div className="py-12 text-center text-sm font-semibold text-zinc-500">Carregando registros…</div> : broadcastLogsError ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{broadcastLogsError}</div> : !broadcastLogs.length ? <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 p-8 text-center"><p className="font-black text-zinc-800">Nenhum aviso registrado ainda</p><p className="mt-1 text-sm text-zinc-500">Os próximos envios aparecerão aqui.</p></div> : <div className="grid gap-3">{broadcastLogs.map(log => <article key={log.id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-2"><div className="font-black text-zinc-900">{log.title || log.subject || (broadcastLogsChannel === 'push' ? 'Aviso por push' : 'Aviso por e-mail')}</div><time className="text-xs font-semibold text-zinc-500">{log.sent_at ? new Date(log.sent_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Data não informada'}</time></div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-600">{log.message || ''}</p><p className="mt-3 text-xs font-bold text-pink-700">{broadcastLogsChannel === 'push' ? `${log.sent_count || 0} dispositivo(s) enviado(s)` : `${log.sent_count || 0} e-mail(s) enviado(s)`}{Number(log.failed_count) > 0 ? ` · ${log.failed_count} falha(s)` : ''}</p></article>)}</div>}
              </div>
            </div>
          </div>
        )}

        <section id="admin-push" className="mt-6 scroll-mt-28 rounded-[1.5rem] border border-pink-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">🔔</div>
            <div><h2 className="text-xl font-black text-zinc-950">Avisos administrativos por push</h2><p className="mt-1 text-sm text-zinc-500">Escreva um aviso e envie para todas as afiliadas com notificações push ativas no site She Afiliadas.</p></div>
          </div>
          <form onSubmit={sendPushBroadcast} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-bold text-zinc-600">Título da notificação<input maxLength={80} value={pushBroadcastTitle} onChange={e => setPushBroadcastTitle(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold text-zinc-900 outline-none focus:border-pink-400" /></label>
            <label className="grid gap-1 text-xs font-bold text-zinc-600">Mensagem<textarea required maxLength={500} rows={3} value={pushBroadcastBody} onChange={e => setPushBroadcastBody(e.target.value)} placeholder="Escreva o aviso que todas as afiliadas receberão..." className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-pink-400" /></label>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-zinc-400">Envia apenas para inscrições ativas. Use com moderação.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openBroadcastLogs('push')} className="rounded-xl border border-pink-200 bg-white px-5 py-3 text-sm font-black text-pink-700 hover:bg-pink-50">Registros</button><button type="submit" disabled={pushBroadcastBusy || !pushBroadcastBody.trim()} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{pushBroadcastBusy ? 'Enviando…' : 'Enviar para todos os apps'}</button></div></div>
          </form>
        </section>

        <section id="admin-email" className="mt-6 scroll-mt-28 rounded-[1.5rem] border border-pink-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">✉️</div>
            <div><h2 className="text-xl font-black text-zinc-950">Avisos administrativos por e-mail</h2><p className="mt-1 text-sm text-zinc-500">Escreva um recado e envie para todas as afiliadas cadastradas que possuem e-mail. A mensagem será enviada em um template She com identidade visual rosa.</p></div>
          </div>
          <form onSubmit={sendEmailBroadcast} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-xs font-bold text-zinc-600">Assunto do e-mail<input required maxLength={120} value={emailBroadcastSubject} onChange={e => setEmailBroadcastSubject(e.target.value)} className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold text-zinc-900 outline-none focus:border-pink-400" placeholder="Assunto do aviso" /></label>
            <label className="grid gap-1 text-xs font-bold text-zinc-600">Mensagem<textarea required maxLength={10000} rows={6} value={emailBroadcastBody} onChange={e => setEmailBroadcastBody(e.target.value)} placeholder="Escreva o recado que todas as afiliadas receberão por e-mail..." className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-medium text-zinc-900 outline-none focus:border-pink-400" /></label>
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-zinc-400">O sistema envia uma cópia individual para cada afiliada com e-mail cadastrado. Será solicitada confirmação antes do envio.</p><div className="flex flex-wrap gap-2"><button type="button" onClick={() => openBroadcastLogs('email')} className="rounded-xl border border-pink-200 bg-white px-5 py-3 text-sm font-black text-pink-700 hover:bg-pink-50">Registros</button><button type="submit" disabled={emailBroadcastBusy || !emailBroadcastSubject.trim() || !emailBroadcastBody.trim()} className="rounded-xl bg-pink-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{emailBroadcastBusy ? 'Enviando…' : 'Enviar e-mail para todas'}</button></div></div>
          </form>
        </section>

        <section id="admin-configuracoes" className="mt-6 scroll-mt-28 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
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

            <div className="md:col-span-2 xl:col-span-4 rounded-[1.5rem] border border-pink-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[.16em] text-pink-700">Bônus de Equipe Avançada · metas mensais</p>
              <p className="mt-1 text-[10px] text-zinc-500">A classificação mais alta atingida vale retroativamente para todas as vendas da equipe no mês. A contagem reinicia no mês seguinte.</p>
              <div className="mt-3 max-w-xs rounded-2xl border border-pink-200 bg-pink-50 p-3">
                <label className="block"><span className="text-[10px] font-black uppercase tracking-[.14em] text-pink-700">Equipe Base · comissão por venda</span><div className="mt-2 flex items-center gap-2"><span className="font-black text-zinc-500">R$</span><input value={settingsForm.teamCommissionPerSale} onChange={e => setSettingsForm(v => ({ ...v, teamCommissionPerSale: e.target.value }))} inputMode="decimal" className="w-full rounded-xl border border-pink-200 bg-white px-3 py-2.5 text-lg font-black outline-none focus:border-pink-400" /></div><p className="mt-2 text-[10px] font-semibold text-pink-700">Comissão base por venda aprovada da equipe direta, antes das metas avançadas.</p></label>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[{n:1,label:'Equipe Avançada I',members:'teamAdvanced1Members',sales:'teamAdvanced1Sales',commission:'teamAdvanced1Commission'},{n:2,label:'Equipe Avançada II',members:'teamAdvanced2Members',sales:'teamAdvanced2Sales',commission:'teamAdvanced2Commission'}].map(tier => <div key={tier.n} className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
                  <p className="font-black text-zinc-900">{tier.label}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <label><span className="text-[10px] font-black uppercase text-zinc-500">Integrantes</span><input value={settingsForm[tier.members]} onChange={e => setSettingsForm(v => ({...v,[tier.members]:e.target.value}))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /></label>
                    <label><span className="text-[10px] font-black uppercase text-zinc-500">Vendas/mês</span><input value={settingsForm[tier.sales]} onChange={e => setSettingsForm(v => ({...v,[tier.sales]:e.target.value}))} inputMode="numeric" className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /></label>
                    <label><span className="text-[10px] font-black uppercase text-zinc-500">R$/venda</span><input value={settingsForm[tier.commission]} onChange={e => setSettingsForm(v => ({...v,[tier.commission]:e.target.value}))} inputMode="decimal" className="mt-1 w-full rounded-xl border border-pink-100 bg-white px-3 py-2.5 font-black" /></label>
                  </div>
                </div>)}
              </div>
            </div>

            <div className="md:col-span-2 xl:col-span-6 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-zinc-400">Atual: Mensal {settings.monthlyLevels?.bronze}/{settings.monthlyLevels?.silver}/{settings.monthlyLevels?.gold} vendas · Fixo {settings.fixedLevels?.bronze}/{settings.fixedLevels?.silver}/{settings.fixedLevels?.gold} vendas · Bronze {brl(settings.commissions?.bronze)} · Prata {brl(settings.commissions?.silver)} · Ouro {brl(settings.commissions?.gold)}</p>
              <button disabled={savingSettings} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500 disabled:opacity-50">{savingSettings ? 'Atualizando…' : 'Atualizar configurações'}</button>
            </div>
          </form>

          <div className="mt-5 border-t border-zinc-100 pt-5">
            <div className="flex flex-col gap-1">
              <p id="admin-revenda" className="scroll-mt-28 text-[10px] font-black uppercase tracking-[.18em] text-pink-500">Revendedora</p>
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

          <div id="admin-impulso" className="mt-5 scroll-mt-28 border-t border-zinc-100 pt-5">
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
              <div className="mt-3 grid gap-2 md:grid-cols-3">{(boostState.active || []).map(item => <div key={item.id} className="rounded-xl bg-white px-3 py-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-black">{item.name}</p><span className="text-[10px] font-black text-pink-600">{item.admin_granted ? 'Gratuito' : brl(item.price)}</span></div><p className="mt-1 text-[10px] text-zinc-400">{item.connections_remaining} de {item.connections_total} conexões restantes</p></div>)}{!(boostState.active || []).length && <p className="text-xs text-zinc-400">Nenhum impulso ativo.</p>}</div>
            </div>
          </div>
        </section>

        <section id="admin-saques" className="mt-6 scroll-mt-28 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Solicitações de saque</h2>
              <p className="mt-1 text-sm text-zinc-400">Selecione uma ou várias solicitações pendentes para enviar os Pix pela Woovi.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Buscar por ID</span>
              <input value={withdrawalSearch} onChange={e => { setWithdrawalSearch(e.target.value.replace(/\D/g, '')); setSelectedWithdrawalIds(new Set()) }} inputMode="numeric" placeholder="ID da afiliada" className="w-32 bg-transparent text-sm font-black text-zinc-800 outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2">
              <span className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Mês</span>
              <select value={withdrawalMonth} onChange={e => { setWithdrawalMonth(e.target.value); setSelectedWithdrawalIds(new Set()) }} className="bg-transparent text-sm font-black text-zinc-800 outline-none">
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
              <FilterPill active={withdrawalFilter === 'all'} onClick={() => { setWithdrawalFilter('all'); setSelectedWithdrawalIds(new Set()) }}>Todos · {withdrawals.length}</FilterPill>
              <FilterPill active={withdrawalFilter === 'pending'} onClick={() => { setWithdrawalFilter('pending'); setSelectedWithdrawalIds(new Set()) }}>Pendentes · {stats.pendingCount}</FilterPill>
              <FilterPill active={withdrawalFilter === 'paid'} onClick={() => { setWithdrawalFilter('paid'); setSelectedWithdrawalIds(new Set()) }}>Pagos · {withdrawals.filter(item => item.status === 'paid').length}</FilterPill><FilterPill active={withdrawalFilter === 'rejected'} onClick={() => { setWithdrawalFilter('rejected'); setSelectedWithdrawalIds(new Set()) }}>Recusados · {withdrawals.filter(item => item.status === 'rejected').length}</FilterPill>
            </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-pink-100 bg-pink-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={allSelectableWithdrawalsSelected}
                aria-label="Selecionar todos os saques pendentes exibidos"
                onClick={toggleSelectAllVisibleWithdrawals}
                disabled={!selectableWithdrawals.length || bulkPayingWithdrawals || payingId !== null}
                className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${allSelectableWithdrawalsSelected ? 'bg-pink-500' : 'bg-zinc-300'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${allSelectableWithdrawalsSelected ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="text-sm font-black text-zinc-900">Selecionar Todos</p>
                <p className="mt-0.5 text-xs text-zinc-500">Seleciona somente saques pendentes ou aprovados exibidos com os filtros atuais.</p>
                <p className="mt-1 text-xs font-bold text-zinc-700">{selectedVisibleWithdrawals.length} de {selectableWithdrawals.length} selecionado(s) · Total: {brl(selectedWithdrawalTotal)}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-700">A aprovação envia solicitações reais à Woovi. Use quando o Pix Out estiver liberado.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={approveSelectedWithdrawals}
              disabled={!selectedVisibleWithdrawals.length || bulkPayingWithdrawals || payingId !== null}
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {bulkPayingWithdrawals ? `Enviando ${bulkProgress?.current || 0}/${bulkProgress?.total || selectedVisibleWithdrawals.length}…` : `Aprovar selecionadas e enviar Pix (${selectedVisibleWithdrawals.length})`}
            </button>
          </div>

          <div className="mt-5 max-h-[500px] space-y-3 overflow-y-auto pr-1">
            {orderedWithdrawals.map(withdrawal => {
              const pending = withdrawal.status === 'pending' || withdrawal.status === 'approved'
              return (
                <div key={withdrawal.id} className={`flex flex-col gap-4 rounded-2xl border px-4 py-4 lg:flex-row lg:items-center lg:justify-between ${selectedWithdrawalIds.has(String(withdrawal.id)) ? 'border-pink-300 bg-pink-50/70' : 'border-zinc-100 bg-zinc-50/70'}`}>
                  <div className="flex min-w-0 items-start gap-3">
                    {pending ? (
                      <button
                        type="button"
                        role="switch"
                        aria-checked={selectedWithdrawalIds.has(String(withdrawal.id))}
                        aria-label={`Selecionar saque #${withdrawal.id}`}
                        onClick={() => toggleWithdrawalSelection(withdrawal.id)}
                        disabled={bulkPayingWithdrawals || payingId !== null}
                        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${selectedWithdrawalIds.has(String(withdrawal.id)) ? 'bg-pink-500' : 'bg-zinc-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${selectedWithdrawalIds.has(String(withdrawal.id)) ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    ) : <span className="w-11 shrink-0" aria-hidden="true" />}
                    <div className="min-w-0">
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
                          disabled={bulkPayingWithdrawals || payingId === withdrawal.id}
                          className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60"
                        >
                          Recusar
                        </button>
                        <button
                          onClick={() => markPaid(withdrawal)}
                          disabled={bulkPayingWithdrawals || payingId === withdrawal.id}
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
                <p className="mt-1 text-sm text-zinc-400">Modo de visualização administrativa. Os dados abaixo são um resumo de desempenho; ações da conta não são executadas nesta janela.</p>
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

      {boostGrantAffiliate && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/55 px-3 py-5" onMouseDown={(event) => { if (event.target === event.currentTarget && !boostGrantBusy) setBoostGrantAffiliate(null) }}>
          <div className="w-full max-w-md rounded-[1.75rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.3)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Premiação administrativa</p>
                <h3 className="mt-1 text-xl font-black text-zinc-950">Conceder Impulso</h3>
                <p className="mt-1 text-sm text-zinc-500">Afiliada: <strong className="text-zinc-800">{boostGrantAffiliate.name}</strong></p>
              </div>
              <button type="button" disabled={boostGrantBusy} onClick={() => setBoostGrantAffiliate(null)} className="h-8 w-8 rounded-full bg-zinc-100 text-lg text-zinc-500 disabled:opacity-50">×</button>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-600">Escolha o impulso gratuito. Ele seguirá a mesma fila e o mesmo carrossel dos impulsos comprados, sem descontar nada do saldo da afiliada.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" disabled={boostGrantBusy} onClick={() => grantTeamBoost(5)} className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-left transition hover:border-pink-400 hover:bg-pink-100 disabled:opacity-50">
                <span className="block text-lg font-black text-pink-700">5 impulsos</span>
                <span className="mt-1 block text-xs font-semibold text-zinc-500">Plano equivalente a R$ 30</span>
              </button>
              <button type="button" disabled={boostGrantBusy} onClick={() => grantTeamBoost(10)} className="rounded-2xl border border-pink-200 bg-pink-50 p-4 text-left transition hover:border-pink-400 hover:bg-pink-100 disabled:opacity-50">
                <span className="block text-lg font-black text-pink-700">10 impulsos</span>
                <span className="mt-1 block text-xs font-semibold text-zinc-500">Plano equivalente a R$ 50</span>
              </button>
            </div>
            {boostGrantBusy && <p className="mt-4 text-center text-xs font-bold text-zinc-500">Concedendo impulso…</p>}
            <p className="mt-4 text-[11px] leading-5 text-zinc-400">Só é possível manter um impulso ativo ou aguardando por afiliada. Se ela já tiver um, o sistema avisará e não criará outro.</p>
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

      {adminDataOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-3 py-5 sm:px-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !adminDataSaving) setAdminDataOpen(false) }}>
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-[0_30px_100px_rgba(0,0,0,.3)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.22em] text-pink-500">Configurações privadas</p>
                <h3 className="mt-1 text-2xl font-black text-zinc-950">Dados do administrador</h3>
                <p className="mt-1 text-sm text-zinc-500">Gerencie o acesso ao painel e os destinatários das notificações.</p>
              </div>
              <button type="button" disabled={adminDataSaving} onClick={() => setAdminDataOpen(false)} className="h-9 w-9 rounded-full bg-zinc-100 text-xl text-zinc-500 disabled:opacity-50">×</button>
            </div>

            {adminDataLoading ? (
              <div className="py-16 text-center text-sm font-semibold text-zinc-400">Carregando dados do administrador…</div>
            ) : !adminDataReady ? (
              <div className="mt-6 space-y-4">
                {adminDataError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{adminDataError}</p>}
                <p className="text-sm leading-6 text-zinc-500">Por segurança, os campos de login e e-mail só ficam editáveis depois que a API carregar os valores atuais.</p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAdminDataOpen(false)} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-600">Fechar</button>
                  <button type="button" onClick={openAdminData} className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-black text-white">Tentar novamente</button>
                </div>
              </div>
            ) : (
              <form onSubmit={saveAdminData} className="mt-6 space-y-5">
                <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <h4 className="text-sm font-black text-zinc-900">Credenciais de acesso</h4>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">Login</span>
                      <input value={adminDataForm.loginUsername} onChange={event => setAdminDataForm(current => ({ ...current, loginUsername: event.target.value }))} autoComplete="username" required minLength={3} maxLength={80} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-pink-400" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">E-mail de login</span>
                      <input value={adminDataForm.loginEmail} onChange={event => setAdminDataForm(current => ({ ...current, loginEmail: event.target.value }))} type="email" autoComplete="email" required className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-pink-400" />
                    </label>
                  </div>
                  <div className="mt-3 rounded-xl border border-pink-100 bg-pink-50 px-3 py-3">
                    <p className="text-xs leading-5 text-pink-800">Para trocar a senha, basta preencher uma nova senha abaixo. Deixe o campo vazio para manter a senha atual. A alteração é protegida pela sua sessão administrativa autenticada.</p>
                  </div>
                  <div className="mt-3">
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">Nova senha (opcional)</span>
                      <input value={adminNewPassword} onChange={event => { setAdminNewPassword(event.target.value); if (!event.target.value) setAdminConfirmPassword('') }} type="password" autoComplete="new-password" minLength={10} placeholder="Mínimo de 10 caracteres" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-pink-400" />
                    </label>
                  </div>
                  {adminNewPassword && (
                    <label className="mt-3 block">
                      <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-500">Confirmar nova senha</span>
                      <input value={adminConfirmPassword} onChange={event => setAdminConfirmPassword(event.target.value)} type="password" autoComplete="new-password" required minLength={10} placeholder="Digite a nova senha novamente" className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm outline-none focus:border-pink-400" />
                    </label>
                  )}
                </section>

                <section className="rounded-2xl border border-pink-100 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-zinc-900">E-mails de notificação</h4>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">Todos os endereços cadastrados receberão os avisos administrativos, como novos saques e vídeos para análise.</p>
                    </div>
                    <button type="button" onClick={() => setAdminDataForm(current => ({ ...current, notificationEmails: [...current.notificationEmails, ''] }))} disabled={adminDataForm.notificationEmails.length >= 20} className="rounded-xl border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-black text-pink-700 disabled:opacity-50">+ Adicionar e-mail</button>
                  </div>
                  <div className="mt-3 space-y-2">
                    {adminDataForm.notificationEmails.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input value={email} onChange={event => setAdminDataForm(current => ({ ...current, notificationEmails: current.notificationEmails.map((value, itemIndex) => itemIndex === index ? event.target.value : value) }))} type="email" placeholder={`notificacoes${index ? `+${index + 1}` : ''}@exemplo.com`} className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-pink-400" />
                        <button type="button" title="Remover e-mail" aria-label={`Remover e-mail ${index + 1}`} onClick={() => setAdminDataForm(current => ({ ...current, notificationEmails: current.notificationEmails.filter((_, itemIndex) => itemIndex !== index) }))} disabled={adminDataForm.notificationEmails.length <= 1} className="h-10 w-10 shrink-0 rounded-xl border border-zinc-200 text-lg font-bold text-zinc-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30">×</button>
                      </div>
                    ))}
                  </div>
                </section>

                {adminDataError && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{adminDataError}</p>}
                {adminDataNotice && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{adminDataNotice}</p>}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" disabled={adminDataSaving} onClick={() => setAdminDataOpen(false)} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-600 disabled:opacity-50">Fechar</button>
                  <button type="submit" disabled={adminDataSaving || adminDataLoading || !adminDataReady} className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-600 disabled:opacity-50">{adminDataSaving ? 'Salvando…' : 'Salvar dados'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
        <section id="admin-compras" className="mx-auto mt-6 w-full max-w-7xl scroll-mt-28 rounded-[1.5rem] border border-pink-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Operação</p><h2 className="mt-1 text-xl font-black text-zinc-950">Compras Afiliadas</h2><p className="mt-1 text-sm text-zinc-500">Gerencie solicitações, dados de entrega, envio e aprovação financeira.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={exportPendingProductPurchasesCsv} title="Baixar CSV das compras aguardando envio" className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M4 3h10l6 6v12H4V3zm9 1.5V10h5.5L13 4.5zM7 13h10v1.5H7V13zm0 3h10v1.5H7V16zm0 3h7v1.5H7V19z"/></svg>CSV</button><span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-700">{productPurchases.filter(p=>p.status==='pending').length} pendente(s)</span></div></div>
          <div className="mt-5">
            <label htmlFor="product-purchase-affiliate-search" className="mb-1.5 block text-xs font-bold text-zinc-600">Buscar solicitações por nome ou ID da afiliada</label>
            <input id="product-purchase-affiliate-search" type="search" value={productPurchaseSearch} onChange={e=>setProductPurchaseSearch(e.target.value)} placeholder="Digite o nome ou ID da afiliada…" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-pink-400 sm:max-w-md" />
            {productPurchaseSearch.trim() && <p className="mt-1.5 text-xs text-zinc-500">{productPurchases.filter(p => String(p.affiliate?.name || '').toLocaleLowerCase('pt-BR').includes(productPurchaseSearch.trim().toLocaleLowerCase('pt-BR')) || String(p.affiliate_id ?? '').includes(productPurchaseSearch.trim())).length} solicitação(ões) encontrada(s).</p>}
          </div>
          <form onSubmit={saveProductPrices} className="mt-5 grid gap-3 rounded-2xl bg-zinc-50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="grid gap-1 text-xs font-bold text-zinc-600">Preço do Hidratante (R$)<input type="number" min="0.01" step="0.01" required value={productPrices.hydrant} onChange={e=>setProductPrices(v=>({...v,hydrant:e.target.value}))} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900" /></label>
            <label className="grid gap-1 text-xs font-bold text-zinc-600">Preço do Stick (R$)<input type="number" min="0.01" step="0.01" required value={productPrices.stick} onChange={e=>setProductPrices(v=>({...v,stick:e.target.value}))} className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900" /></label>
            <button disabled={productPriceBusy} className="rounded-xl bg-pink-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50">{productPriceBusy?'Salvando…':'Salvar preços'}</button>
          </form>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-pink-100 bg-pink-50 p-3"><label className="flex items-center gap-2 text-xs font-bold text-zinc-700"><input type="checkbox" checked={eligibleMelhorEnvioPurchases.length > 0 && eligibleMelhorEnvioPurchases.every(p => selectedProductPurchaseIds.has(p.id))} onChange={toggleAllProductPurchases} className="h-4 w-4 accent-pink-600" />Selecionar todos os pedidos elegíveis ({eligibleMelhorEnvioPurchases.length})</label><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-zinc-600">{selectedProductPurchaseIds.size} selecionado(s)</span><button type="button" onClick={quoteSelectedWithMelhorEnvio} disabled={melhorEnvioBusy || selectedProductPurchaseIds.size === 0} className="rounded-xl bg-pink-600 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{melhorEnvioBusy ? 'Cotando…' : 'Cotar selecionados no Melhor Envio'}</button></div><p className="w-full text-[11px] leading-5 text-zinc-500">Elegíveis: solicitações pendentes com frete aprovado, sem etiqueta e sem rastreio. Após cotar, escolha a transportadora e adicione a etiqueta ao carrinho; o pagamento é finalizado no site do Melhor Envio. Amostra: R$ 30,00 · Peso 150 g · 19 × 25 × 5 cm · Origem 30190-000.</p></div>
          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3"><div className="max-h-[570px] min-h-[180px] space-y-3 overflow-y-auto pr-2">{productPurchases.filter(p => { const query = productPurchaseSearch.trim().toLocaleLowerCase('pt-BR'); return !query || String(p.affiliate?.name || '').toLocaleLowerCase('pt-BR').includes(query) || String(p.affiliate_id ?? '').includes(query) }).map(p=> <article key={p.id} className="min-h-[180px] rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-2">{p.status==='pending' && p.freight_paid===true && !p.tracking_url && <input aria-label={`Selecionar solicitação ${p.id} para Melhor Envio`} type="checkbox" checked={selectedProductPurchaseIds.has(p.id)} onChange={()=>toggleProductPurchaseSelection(p.id)} className="mt-1 h-4 w-4 shrink-0 accent-pink-600" />}<div><h3 className="font-black text-zinc-950">#{p.id} · {p.product==='hydrant'?'Hidratante She':'Stick Clareador She'} · {brl(p.price)}</h3><p className="mt-1 text-xs text-zinc-500">{p.affiliate?.name || `Afiliada #${p.affiliate_id}`} · ID {p.affiliate_id} · {dateTime(p.created_at)} · {({pending: p.freight_paid === true ? 'Frete pago · Pendente de envio' : 'Aguardando pagamento do frete',shipped:'Enviado',approved:'Aprovado / saldo abatido',rejected:'Recusado',cancelled:'Cancelado'})[p.status] || p.status}</p>{(() => { const quoteResult = melhorEnvioResults[p.id]; const quotes = quoteResult?.quotes || p.melhor_envio_quote?.quotes || []; if (quoteResult && !quoteResult.ok) return <div className="mt-2 rounded-lg bg-rose-50 p-2 text-xs text-rose-900">Não cotado: {quoteResult.error}</div>; if (p.melhor_envio_shipment_id) return <div className="mt-2 rounded-lg bg-emerald-50 p-2 text-xs font-bold text-emerald-800">{p.tracking_url ? `Rastreio identificado no Melhor Envio${p.melhor_envio_tracking_code ? ` · Código ${p.melhor_envio_tracking_code}` : ''}. Confira o link e clique em “Marcar como enviado” quando o pacote estiver despachado.` : `Etiqueta adicionada ao carrinho do Melhor Envio · ID ${p.melhor_envio_shipment_id}. Finalize a compra no site deles.`}</div>; if (!quotes.length) return null; return <div className="mt-2 space-y-2 rounded-lg bg-sky-50 p-2 text-xs text-sky-900"><strong>Cotações Melhor Envio:</strong>{quotes.map((q, qi) => <div key={`${p.id}-${q.id || q.service_id || qi}`} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/80 p-2"><span>{q.company?.name || q.company || q.name || 'Transportadora'} — R$ {Number(q.price || q.custom_price || 0).toFixed(2).replace('.', ',')} ({q.delivery_time || q.delivery_range?.min || '?'} dias)</span><button type="button" onClick={() => addMelhorEnvioQuoteToCart(p, q)} disabled={melhorEnvioCartBusy === p.id} className="rounded-lg bg-emerald-600 px-3 py-2 font-black text-white disabled:opacity-50">{melhorEnvioCartBusy === p.id ? 'Adicionando…' : 'Adicionar ao carrinho'}</button></div>)}</div> })()}</div></div>
            {p.status==='pending' && <div className="flex w-full flex-col items-stretch gap-2 sm:w-[360px]"><label className="grid gap-1 text-[10px] font-bold text-zinc-500">Link de rastreio<input type="url" value={productTrackingLinks[p.id] ?? p.tracking_url ?? ''} onChange={e=>setProductTrackingLinks(current=>({...current,[p.id]:e.target.value}))} placeholder="https://..." className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 outline-none focus:border-sky-400" /></label><div className="flex flex-wrap items-start gap-2">{p.melhor_envio_shipment_id && !p.tracking_url && <button type="button" disabled={productPurchaseBusy===p.id} onClick={()=>syncProductPurchaseTracking(p)} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-black text-amber-900 disabled:opacity-50">{productPurchaseBusy===p.id ? 'Buscando rastreio…' : 'Buscar rastreio'}</button>}<div className="flex flex-col items-start gap-1"><button disabled={productPurchaseBusy===p.id || p.freight_paid !== true || !/^https?:\/\//i.test(String(productTrackingLinks[p.id] ?? p.tracking_url ?? '').trim())} title={p.freight_paid !== true ? 'Aguardando confirmação do frete pela Woovi' : 'Marcar como enviado'} onClick={()=>updateProductPurchase(p,'shipped')} className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Marcar como enviado</button><span className={`text-[10px] font-semibold ${p.freight_paid === true ? 'text-emerald-700' : 'text-amber-700'}`}>{p.freight_paid === true ? 'Pagamento do frete aprovado' : 'Aguardando pagamento do frete'}</span></div><button disabled={productPurchaseBusy===p.id} onClick={()=>updateProductPurchase(p,'rejected')} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-700">Recusar</button></div></div>}
            {p.status==='shipped' && <button disabled={productPurchaseBusy===p.id} onClick={()=>updateProductPurchase(p,'approved')} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white">Aprovar e abater saldo</button>}
            </div>
            {p.tracking_url && ['shipped','approved'].includes(p.status) && <p className="mt-3 text-xs font-semibold text-sky-800">Rastreio salvo: <a href={p.tracking_url} target="_blank" rel="noreferrer" className="break-all underline">{p.tracking_url}</a></p>}<div className="mt-3 grid gap-2 text-xs text-zinc-700 sm:grid-cols-2"><p><strong>Nome:</strong> {p.full_name}</p><p><strong>CPF:</strong> {p.cpf}</p><p><strong>CEP:</strong> {p.cep}</p><p><strong>E-mail:</strong> {p.email}</p><p><strong>Telefone:</strong> {p.phone}</p><p className="sm:col-span-2"><strong>Endereço:</strong> {p.address}</p>{p.notes && <p className="sm:col-span-2"><strong>Observações:</strong> {p.notes}</p>}</div>
          </article>)}{!productPurchases.length && <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">Nenhuma compra solicitada ainda.</div>}{productPurchases.length > 0 && !productPurchases.some(p => { const query = productPurchaseSearch.trim().toLocaleLowerCase('pt-BR'); return !query || String(p.affiliate?.name || '').toLocaleLowerCase('pt-BR').includes(query) || String(p.affiliate_id ?? '').includes(query) }) && <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-sm text-zinc-400">Nenhuma solicitação encontrada para essa afiliada.</div>}</div></div>
        </section>

        <section id="admin-videos" className="mx-auto mt-6 w-full max-w-7xl scroll-mt-28 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
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

        <footer className="mx-auto mt-8 flex w-full max-w-7xl flex-col gap-3 rounded-2xl border border-pink-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-zinc-400">She Afiliadas · Administração</p>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openAdminData} className="rounded-xl border border-pink-200 bg-white px-4 py-2.5 text-sm font-black text-pink-600 transition hover:bg-pink-50">Dados</button>
            <button onClick={logout} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white">Sair</button>
          </div>
        </footer>

    </main>
  )
}

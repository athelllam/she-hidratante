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

function whatsappUrl(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}`
}

function formatWhatsapp(value) {
  const digits = String(value || '').replace(/\D/g, '')
  const local = digits.startsWith('55') ? digits.slice(2) : digits
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return value || 'WhatsApp não informado'
}

function withdrawalStatusLabel(status) {
  if (status === 'approved') return 'Aprovado'
  if (status === 'paid') return 'Pago'
  if (status === 'processing') return 'Processando Pix'
  if (status === 'failed') return 'Falhou'
  if (status === 'rejected') return 'Recusado'
  if (status === 'cancelled') return 'Cancelado'
  return 'Pendente'
}

function boostStatusLabel(status) {
  if (status === 'active') return 'Ativo'
  if (status === 'completed') return 'Concluído'
  if (status === 'cancelled') return 'Saldo devolvido'
  return 'Reservado na fila'
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
  const [selectedMonth, setSelectedMonth] = useState('all')
  const [registerMode, setRegisterMode] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', whatsapp: '', cpf: '' })
  const [login, setLogin] = useState({ email: '', password: '' })
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotBusy, setForgotBusy] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
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
  const [teamSearch, setTeamSearch] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [teamJoinBusy, setTeamJoinBusy] = useState(false)
  const [teamJoinMessage, setTeamJoinMessage] = useState('')
  const [teamBoost, setTeamBoost] = useState(null)
  const [teamBoostBusy, setTeamBoostBusy] = useState(false)
  const [teamBoostMessage, setTeamBoostMessage] = useState('')
  const [teamReservation, setTeamReservation] = useState(null)
  const [teamLookup, setTeamLookup] = useState(null)
  const [teamLookupBusy, setTeamLookupBusy] = useState(false)
  const [teamLookupMessage, setTeamLookupMessage] = useState('')
  const [teamConfirmOpen, setTeamConfirmOpen] = useState(false)
  const [teamConfirmParent, setTeamConfirmParent] = useState(null)
  const [teamConfirmType, setTeamConfirmType] = useState('manual')
  const [teamWhatsappConsent, setTeamWhatsappConsent] = useState(false)
  const [teamFixedTeamConsent, setTeamFixedTeamConsent] = useState(false)
  const [videoSubmissions, setVideoSubmissions] = useState([])
  const [videoUrl, setVideoUrl] = useState('')
  const [videoTermsOpen, setVideoTermsOpen] = useState(false)
  const [videoTermsAccepted, setVideoTermsAccepted] = useState(false)
  const [videoBusy, setVideoBusy] = useState(false)
  const [videoMessage, setVideoMessage] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixKeyType, setPixKeyType] = useState('CPF')
  const [pixOpen, setPixOpen] = useState(false)
  const [pixBusy, setPixBusy] = useState(false)
  const [pixMessage, setPixMessage] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [profileForm, setProfileForm] = useState({ email: '', cpf: '', whatsapp: '', password: '' })
  const [profileBusy, setProfileBusy] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const [levelHelpOpen, setLevelHelpOpen] = useState(false)
  const [fixedHelpOpen, setFixedHelpOpen] = useState(false)
  const [videoHelpOpen, setVideoHelpOpen] = useState(false)
  const [boostHelpOpen, setBoostHelpOpen] = useState(false)
  const [registerTermsCardOpen, setRegisterTermsCardOpen] = useState(false)
  const [registerTermsOpen, setRegisterTermsOpen] = useState(false)
  const [linkSlug, setLinkSlug] = useState('')
  const [linkBusy, setLinkBusy] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const chartScrollRef = useRef(null)

  useEffect(() => {
    const node = chartScrollRef.current
    const chartData = dashboard?.chart || []
    if (!node || !chartData.length) return
    requestAnimationFrame(() => { node.scrollLeft = node.scrollWidth })
  }, [dashboard?.chart])

  const load = async ({ sync = false, month = selectedMonth } = {}) => {
    try {
      const dashboardUrl = `/api/affiliate/dashboard?month=${encodeURIComponent(month || 'all')}`
      const data = await api(dashboardUrl)
      setAffiliate(data.affiliate)
      setPixKey(data.affiliate?.pix_key || '')
      setPixKeyType(data.affiliate?.pix_key_type || 'CPF')
      setDashboard(data)
      try {
        const boostData = await api('/api/affiliate/dashboard?boost=1')
        setTeamBoost(boostData)
        if (boostData.boost?.status === 'queued' || boostData.boost?.status === 'active') setTeamReservation(null)
      } catch {
        setTeamBoost(null)
      }
      try {
        const videoData = await api('/api/affiliate/dashboard?videos=1')
        setVideoSubmissions(videoData.videos || [])
      } catch {
        setVideoSubmissions([])
      }
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
            const refreshed = await api(dashboardUrl)
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

  useEffect(() => {
    const numericValue = String(teamCode || '').trim()
    if (!affiliate?.id || !numericValue || !/^\d+$/.test(numericValue) || teamReservation) {
      setTeamLookup(null)
      setTeamLookupMessage('')
      setTeamLookupBusy(false)
      return undefined
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      setTeamLookupBusy(true)
      setTeamLookupMessage('')
      try {
        const result = await api('/api/affiliate/dashboard', {
          method: 'POST',
          body: JSON.stringify({ action: 'team_lookup', parentId: Number(numericValue) }),
        })
        if (cancelled) return
        setTeamLookup(result.parent || null)
        setTeamLookupMessage(result.parent ? '' : (result.message || 'Não encontramos uma afiliada ativa com esse ID.'))
      } catch (e) {
        if (cancelled) return
        setTeamLookup(null)
        setTeamLookupMessage(e.message || 'Não foi possível consultar esse ID agora.')
      } finally {
        if (!cancelled) setTeamLookupBusy(false)
      }
    }, 350)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [teamCode, teamReservation, affiliate?.id])

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

  const submitForgotPassword = async (event) => {
    event?.preventDefault()
    setForgotBusy(true)
    setForgotMessage('')
    try {
      const email = String(forgotEmail || '').trim().toLowerCase()
      if (!email) throw new Error('Informe seu e-mail.')
      const result = await api('/api/affiliate/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setForgotMessage(result.message || 'Se o e-mail estiver cadastrado, você receberá o link para redefinir sua senha.')
    } catch (e) {
      setForgotMessage(e.message || 'Não foi possível enviar o link de recuperação.')
    } finally {
      setForgotBusy(false)
    }
  }

  const submitRegister = (event) => {
    event.preventDefault()
    setError('')
    setRegisterTermsCardOpen(true)
  }

  const acceptRegisterTermsAndCreate = async () => {
    setBusy(true); setError('')
    try {
      await api('/api/affiliate/register', { method: 'POST', body: JSON.stringify(form) })
      setRegisterTermsCardOpen(false)
      setRegisterTermsOpen(false)
      await load({ sync: true })
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  const createAffiliateLink = async (event) => {
    event.preventDefault()
    setLinkBusy(true)
    setLinkMessage('')
    try {
      const result = await api('/api/affiliate/dashboard', {
        method: 'POST',
        body: JSON.stringify({ action: 'create_link', slug: linkSlug }),
      })
      setAffiliate(current => current ? { ...current, slug: result.affiliate?.slug || '' } : current)
      setLinkSlug('')
      setLinkMessage('Seu link foi criado com sucesso.')
      await load({ sync: false })
    } catch (e) {
      setLinkMessage(e.message || 'Não foi possível criar seu link.')
    } finally {
      setLinkBusy(false)
    }
  }

  const openProfile = () => {
    setProfileForm({ email: affiliate?.email || '', cpf: affiliate?.cpf || '', whatsapp: affiliate?.whatsapp || '', password: '' })
    setProfileMessage('')
    setProfileOpen(true)
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setProfileBusy(true)
    setProfileMessage('')
    try {
      const result = await api('/api/affiliate/dashboard', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_profile', ...profileForm }),
      })
      setAffiliate(current => current ? { ...current, ...result.affiliate } : current)
      setProfileForm(current => ({ ...current, password: '' }))
      setProfileMessage(result.passwordChanged ? 'Dados e senha atualizados com sucesso.' : 'Dados atualizados com sucesso.')
    } catch (e) {
      setProfileMessage(e.message || 'Não foi possível atualizar seus dados.')
    } finally {
      setProfileBusy(false)
    }
  }

  const logout = async () => {
    await api('/api/affiliate/logout', { method: 'POST' }).catch(() => {})
    setAffiliate(null)
    setDashboard(null)
  }

  const changeSelectedMonth = async (value) => {
    setSelectedMonth(value)
    try {
      const data = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(value || 'all')}`)
      setDashboard(data)
    } catch (e) {
      setError(e.message || 'Não foi possível carregar os indicadores do mês.')
    }
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
      const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth || 'all')}`)
      setDashboard(refreshed)
    } catch (e) {
      setWithdrawMessage(e.message || 'Não foi possível solicitar o saque.')
    } finally {
      setWithdrawBusy(false)
    }
  }

  const resetTeamTerms = () => {
    setTeamWhatsappConsent(false)
    setTeamFixedTeamConsent(false)
  }

  const openTeamConfirmation = (parent, type) => {
    setTeamConfirmParent(parent)
    setTeamConfirmType(type)
    resetTeamTerms()
    setTeamConfirmOpen(true)
    setTeamJoinMessage('')
    setTeamBoostMessage('')
  }

  const closeTeamConfirmation = () => {
    setTeamConfirmOpen(false)
    resetTeamTerms()
  }

  // O primeiro clique apenas abre a confirmação; o vínculo só é criado após os dois aceites.
  const joinTeam = (event) => {
    event.preventDefault()
    if (teamReservation?.reservationId) {
      openTeamConfirmation({
        id: Number(teamReservation.parentId),
        parentId: Number(teamReservation.parentId),
        name: teamReservation.parentName,
        parentName: teamReservation.parentName,
        whatsapp: teamReservation.parentWhatsapp || '',
        parentWhatsapp: teamReservation.parentWhatsapp || '',
      }, 'boost')
      return
    }
    const numericId = Number(String(teamCode).trim())
    if (!teamLookup || Number(teamLookup.id) !== numericId) {
      setTeamJoinMessage('Aguarde a confirmação do nome da afiliada mãe antes de continuar.')
      return
    }
    openTeamConfirmation(teamLookup, 'manual')
  }

  const confirmTeamJoin = async () => {
    if (!teamWhatsappConsent || !teamFixedTeamConsent) return
    setTeamJoinBusy(true)
    setTeamJoinMessage('')
    setTeamBoostMessage('')
    try {
      const commonTerms = {
        teamTermsVersion: '1.0',
        teamWhatsappConsent: true,
        teamFixedTeamConsent: true,
      }
      let result
      if (teamConfirmType === 'boost' && teamReservation?.reservationId) {
        result = await api('/api/affiliate/dashboard', {
          method: 'POST',
          body: JSON.stringify({ action: 'boost_confirm', reservationId: teamReservation.reservationId, ...commonTerms }),
        })
      } else {
        const numericId = Number(teamConfirmParent?.id || teamConfirmParent?.parentId || teamCode)
        if (!Number.isInteger(numericId) || numericId <= 0) throw new Error('Informe um ID numérico de afiliada mãe válido.')
        result = await api('/api/affiliate/dashboard', {
          method: 'POST',
          body: JSON.stringify({ teamParentId: numericId, ...commonTerms }),
        })
      }
      setAffiliate(current => current ? { ...current, team_parent_id: result.affiliate?.team_parent_id || result.result?.parentId || true } : current)
      setTeamJoinMessage('Você entrou na equipe com sucesso.')
      setTeamCode('')
      setTeamLookup(null)
      setTeamLookupMessage('')
      setTeamReservation(null)
      setTeamConfirmOpen(false)
      resetTeamTerms()
      const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth || 'all')}`)
      setDashboard(refreshed)
      try { setTeamBoost(await api('/api/affiliate/dashboard?boost=1')) } catch {}
    } catch (e) {
      setTeamJoinMessage(e.message || 'Não foi possível entrar na equipe.')
    } finally {
      setTeamJoinBusy(false)
    }
  }

  const findTeam = async () => {
    setTeamBoostBusy(true)
    setTeamBoostMessage('')
    setTeamJoinMessage('')
    try {
      const result = await api('/api/affiliate/dashboard', { method: 'POST', body: JSON.stringify({ action: 'boost_find' }) })
      const reservation = result.reservation || null
      if (!reservation?.reservationId || !reservation?.parentId) throw new Error('Não foi possível confirmar a afiliada selecionada.')
      const normalized = {
        ...reservation,
        parentId: Number(reservation.parentId),
        parentName: reservation.parentName || 'Afiliada mãe',
        parentWhatsapp: reservation.parentWhatsapp || '',
      }
      setTeamReservation(normalized)
      setTeamCode(String(normalized.parentId))
      setTeamLookup(null)
      setTeamLookupMessage('')
      openTeamConfirmation({
        id: normalized.parentId,
        parentId: normalized.parentId,
        name: normalized.parentName,
        parentName: normalized.parentName,
        whatsapp: normalized.parentWhatsapp,
        parentWhatsapp: normalized.parentWhatsapp,
      }, 'boost')
      setTeamBoostMessage('Encontramos uma afiliada mãe para você.')
    } catch (e) {
      setTeamBoostMessage(e.message || 'Não foi possível encontrar uma equipe agora.')
    } finally {
      setTeamBoostBusy(false)
    }
  }

  const purchaseBoost = async (plan) => {
    setTeamBoostBusy(true)
    setTeamBoostMessage('')
    try {
      await api('/api/affiliate/dashboard', { method: 'POST', body: JSON.stringify({ action: 'boost_purchase', plan }) })
      setTeamBoostMessage('Impulso contratado. Seu saldo foi reservado e sua posição na fila foi registrada.')
      const [refreshed, boostData] = await Promise.all([api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth || 'all')}`), api('/api/affiliate/dashboard?boost=1')])
      setDashboard(refreshed)
      setTeamBoost(boostData)
    } catch (e) {
      setTeamBoostMessage(e.message || 'Não foi possível contratar o impulso.')
    } finally {
      setTeamBoostBusy(false)
    }
  }

  const leaveBoostQueue = async () => {
    setTeamBoostBusy(true)
    setTeamBoostMessage('')
    try {
      await api('/api/affiliate/dashboard', { method: 'POST', body: JSON.stringify({ action: 'boost_leave_queue' }) })
      setTeamBoostMessage('Você saiu da fila e o valor foi devolvido ao seu saldo.')
      const [refreshed, boostData] = await Promise.all([api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth || 'all')}`), api('/api/affiliate/dashboard?boost=1')])
      setDashboard(refreshed)
      setTeamBoost(boostData)
    } catch (e) {
      setTeamBoostMessage(e.message || 'Não foi possível sair da fila.')
    } finally {
      setTeamBoostBusy(false)
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
      const refreshed = await api(`/api/affiliate/dashboard?month=${encodeURIComponent(selectedMonth || 'all')}`)
      setDashboard(refreshed)
    } catch (e) {
      setTeamWithdrawMessage(e.message || 'Não foi possível solicitar o saque de equipe.')
    } finally {
      setTeamWithdrawBusy(false)
    }
  }

  const submitVideo = async () => {
    setVideoBusy(true)
    setVideoMessage('')
    try {
      await api('/api/affiliate/dashboard', {
        method: 'POST',
        body: JSON.stringify({ action: 'submit_video', videoUrl: videoUrl.trim(), termsAccepted: true, termsVersion: '1.0' }),
      })
      setVideoUrl('')
      setVideoTermsAccepted(false)
      setVideoTermsOpen(false)
      setVideoMessage('Link enviado. Sua solicitação está pendente de análise pela SHE.')
      const refreshed = await api('/api/affiliate/dashboard?videos=1')
      setVideoSubmissions(refreshed.videos || [])
    } catch (e) {
      setVideoMessage(e.message || 'Não foi possível enviar o link.')
    } finally {
      setVideoBusy(false)
    }
  }

  const savePix = async (event) => {
    event.preventDefault()
    setPixBusy(true)
    setPixMessage('')
    try {
      const result = await api('/api/affiliate/withdraw', {
        method: 'PATCH',
        body: JSON.stringify({ pixKey: pixKey.trim(), pixKeyType }),
      })
      const saved = result.pixKey || pixKey.trim()
      setPixKey(saved)
      setAffiliate(current => current ? { ...current, pix_key: saved, pix_key_type: pixKeyType } : current)
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
              <button type="button" onClick={() => { setForgotOpen(v => !v); setForgotEmail(''); setForgotMessage('') }} className="mx-auto flex items-center justify-center pt-1 text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-600">
                Esqueceu sua senha? Receba um link por e-mail
              </button>

              {forgotOpen && (
                <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-4">
                  <p className="text-sm font-black text-zinc-900">Redefinir senha</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Digite o e-mail cadastrado na sua conta e enviaremos um link seguro para criar uma nova senha.</p>
                  <div className="mt-3 space-y-2">
                    <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} type="email" required placeholder="Seu e-mail" className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-pink-400" />
                    <button type="button" onClick={submitForgotPassword} disabled={forgotBusy} className="w-full rounded-xl bg-zinc-950 py-2.5 text-sm font-black text-white disabled:opacity-60">{forgotBusy ? 'Enviando…' : 'Enviar link por e-mail'}</button>
                  </div>
                  {forgotMessage && <p className="mt-2 text-xs leading-5 text-zinc-500">{forgotMessage}</p>}
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={submitRegister} className="mt-7 space-y-3">
              <input value={form.name} onChange={e => setForm({...form,name:e.target.value})} required placeholder="Seu nome" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.whatsapp} onChange={e => setForm({...form,whatsapp:e.target.value})} type="tel" required placeholder="WhatsApp (31) 99999-9999" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.cpf} onChange={e => setForm({...form,cpf:e.target.value})} inputMode="numeric" maxLength={14} required placeholder="CPF" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.email} onChange={e => setForm({...form,email:e.target.value})} type="email" required placeholder="E-mail" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              <input value={form.password} onChange={e => setForm({...form,password:e.target.value})} type="password" minLength={8} required placeholder="Senha (mín. 8 caracteres)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-2xl bg-pink-500 py-3.5 font-bold text-white disabled:opacity-60">Criar conta</button>

              {registerTermsCardOpen && (
                <div className="mt-4 rounded-2xl border border-pink-100 bg-pink-50/70 p-4">
                  <p className="text-sm font-black text-zinc-900">Termos e Condições</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Antes de criar sua conta, leia e aceite os Termos e Condições do programa de afiliadas.</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => setRegisterTermsOpen(true)} className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700">Ler Termos e Condições</button>
                    <button type="button" disabled={busy} onClick={acceptRegisterTermsAndCreate} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? 'Criando…' : 'Aceitar e cadastrar'}</button>
                  </div>
                </div>
              )}
            </form>
          )}

          <button type="button" onClick={() => { setRegisterMode(v => !v); setError(''); setRegisterTermsCardOpen(false); setRegisterTermsOpen(false) }} className="mt-4 w-full text-sm font-bold text-pink-500">
            {registerMode ? 'Já tenho uma conta' : 'Quero ser afiliada'}
          </button>

          {registerTermsOpen && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-5 py-8" onMouseDown={event => { if (event.target === event.currentTarget) setRegisterTermsOpen(false) }}>
              <div role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.3)]">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Termos e Condições</p><h3 className="mt-1 text-2xl font-black text-zinc-950">Programa de Afiliadas SHE</h3></div>
                  <button type="button" onClick={() => setRegisterTermsOpen(false)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-500">×</button>
                </div>
                <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-600">
                  <p><strong>1. Natureza da relação.</strong> O programa de afiliadas é uma relação comercial independente para divulgação de produtos e geração de vendas. A afiliada atua por sua própria conta e risco, sem salário, jornada, controle de ponto, subordinação, exclusividade ou garantia de remuneração mínima.</p>
                  <p><strong>2. Autonomia.</strong> A afiliada organiza livremente seus horários, métodos, canais e rotina de divulgação, podendo exercer outras atividades e trabalhar com outras empresas, desde que respeite a legislação e estes termos.</p>
                  <p><strong>3. Comissões.</strong> Os valores pagos decorrem exclusivamente de vendas elegíveis atribuídas ao link da afiliada e das regras comerciais vigentes. Comissão não constitui salário, ajuda de custo, benefício ou remuneração por disponibilidade.</p>
                  <p><strong>4. Ausência de garantia.</strong> A SHE não garante quantidade de vendas, faturamento, comissão ou renda. Resultados dependem das vendas efetivamente realizadas e validadas.</p>
                  <p><strong>5. Custos e obrigações.</strong> A afiliada é responsável por seus próprios equipamentos, internet, produção de conteúdo, publicidade, tributos e demais custos relacionados à sua atividade, salvo quando a SHE expressamente assumir determinado custo.</p>
                  <p><strong>6. Saques.</strong> Solicitações de saque estão sujeitas à conferência e processamento e podem levar <strong>até 3 dias</strong>. O prazo pode ser afetado por informações incorretas, inconsistências, fraude ou indisponibilidade de meios de pagamento.</p>
                  <p><strong>7. Conteúdo e publicidade.</strong> A afiliada deve divulgar os produtos de forma verdadeira, responsável e compatível com as orientações da SHE, sem prometer resultados garantidos, fazer alegações não autorizadas ou utilizar conteúdo que viole direitos de terceiros.</p>
                  <p><strong>8. Sistema de equipes.</strong> O sistema de equipes <strong>não é um sistema de pirâmide financeira</strong>. Não há cobrança para recrutar pessoas nem pagamento simplesmente pelo recrutamento. A equipe é apenas um mecanismo de incentivo comercial destinado a recompensar a afiliada mãe pelo suporte, treinamento e orientação que voluntariamente oferece às afiliadas de sua equipe. A afiliada mãe não é empregadora, chefe ou supervisora das demais afiliadas.</p>
                  <p><strong>9. Conduta.</strong> É proibido manipular vendas, utilizar fraude, autoindicação indevida, pedidos fictícios, spam, informações falsas, práticas enganosas ou qualquer conduta destinada a gerar comissão de maneira irregular. A SHE poderá suspender ou encerrar contas que violem estas regras.</p>
                  <p><strong>10. Reestruturação e alterações do plano de bonificação.</strong> A afiliada declara estar ciente e aceitar que, em caso de reestruturação do programa, a SHE poderá alterar, substituir ou reorganizar os planos de bonificação, critérios de elegibilidade, valores de comissão e regras de cálculo. As alterações poderão influenciar os critérios e valores de cálculo das comissões, bem como o saldo atual e futuro da afiliada. A SHE comunicará qualquer alteração na estrutura com antecedência mínima de 30 (trinta) dias corridos, por aviso na plataforma e/ou pelos canais de contato cadastrados. Durante esse prazo, a afiliada poderá se programar e solicitar as movimentações de saldo disponíveis que desejar realizar antes da entrada em vigor das mudanças. Ao término do prazo informado, as novas regras poderão ser aplicadas conforme a reestruturação comunicada, inclusive com impacto na apuração das comissões e na composição, disponibilidade e movimentação do saldo existente e futuro, observada a legislação aplicável.</p>
                  <p><strong>11. Lei e direitos legais.</strong> Estes termos descrevem a natureza pretendida da relação comercial e não têm por objetivo afastar direitos que não possam ser renunciados por lei. A realidade da relação entre as partes deverá permanecer compatível com a autonomia aqui descrita.</p>
                </div>
                <div className="mt-6 flex justify-end"><button type="button" onClick={() => setRegisterTermsOpen(false)} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white">Fechar</button></div>
              </div>
            </div>
          )}
        </div>
      </main>
    )
  }

  const chart = dashboard?.chart || []
  const maxSales = Math.max(1, ...chart.map(x => Number(x.sales || 0)))
  // Reserva espaço vertical para o rótulo acima da maior barra, mantendo a escala proporcional.
  const chartScaleMax = maxSales * 1.25
  const chartBarAreaHeight = 88

  const hasAffiliateLink = Boolean(affiliate.slug)
  const publicUrl = hasAffiliateLink ? `https://shecoisademulher.com/${affiliate.slug}` : ''
  const qrUrl = publicUrl ? `https://quickchart.io/qr?size=220&text=${encodeURIComponent(publicUrl)}` : ''
  const config = dashboard?.settings || { ticketThreshold: 170, ticketBonus: 5, teamCommissionPerSale: 10, commissions: { none: 30, bronze: 40, silver: 50, gold: 60 } }
  const level = dashboard?.monthlyLevel || dashboard?.level || { key: 'none', label: 'Início', sales: 0, commissionPerOrder: Number(config.commissions?.none || 30), progress: 0, nextLevel: 'Bronze', nextMinSales: config.monthlyLevels?.bronze || 10, salesToNext: config.monthlyLevels?.bronze || 10 }
  const monthlyLevel = dashboard?.monthlyLevel || level
  const fixedLevel = dashboard?.fixedLevel || { key: 'none', label: 'Início', sales: Number(dashboard?.lifetimeSales || 0), progress: 0 }
  const months = dashboard?.months?.length ? dashboard.months : []
  const fixedProgress = fixedLevel.progress || 0
  const availableCommission = Number(dashboard?.metrics?.availableCommission || 0)
  const currentMonthPersonalSales = Number(dashboard?.metrics?.currentMonthPersonalSales || 0)
  const canWithdrawThisMonth = currentMonthPersonalSales >= 1
  const team = dashboard?.team || { code: affiliate.team_code || '', joined: false, canJoin: false, commissionPerSale: 10, earnedCommission: 0, availableCommission: 0, members: [], parent: null }
  const normalizedTeamSearch = teamSearch.trim().toLocaleLowerCase('pt-BR')
  const filteredTeamMembers = (team.members || []).filter(member =>
    String(member.name || '').toLocaleLowerCase('pt-BR').includes(normalizedTeamSearch) ||
    String(member.id ?? '').toLocaleLowerCase('pt-BR').includes(normalizedTeamSearch)
  )

  return (
    <main className="min-h-screen bg-[#fffafc] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-pink-500">She Afiliadas</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-zinc-950">Olá, {affiliate.name}.</h1>
            <p className="mt-2 text-sm text-zinc-500">{selectedMonth === 'all' ? 'Indicadores acumulados de todo o período' : `Indicadores de ${monthLabel(selectedMonth)}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {syncMessage && <span className="text-xs font-semibold text-zinc-400">{syncMessage}</span>}
            <button type="button" onClick={openProfile} className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-black text-zinc-700 shadow-sm transition hover:border-pink-300 hover:text-pink-600">
              Meus Dados
            </button>
            <button onClick={() => load({ sync: true })} disabled={syncing} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60">
              {syncing ? 'Atualizando…' : 'Atualizar vendas'}
            </button>
            {hasAffiliateLink && <Link to={`/${affiliate.slug}`} className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-zinc-800 shadow-sm border border-zinc-200">Ver página</Link>}
            <button onClick={logout} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white">Sair</button>
          </div>
        </header>

        {!hasAffiliateLink && (
          <section className="relative mt-7 overflow-hidden rounded-[2rem] border-2 border-pink-200 bg-white p-6 shadow-[0_0_35px_rgba(236,72,153,.28)] md:p-8">
            <div className="absolute -inset-1 -z-10 rounded-[2rem] bg-pink-300/20 blur-2xl" />
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-pink-500">Primeiro passo</p>
            <h2 className="mt-2 text-2xl font-black text-zinc-950">Crie seu link de afiliada</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">Escolha o nome que você quer usar no seu link. Seu ID já foi criado e será acrescentado automaticamente.</p>
            <form onSubmit={createAffiliateLink} className="mt-5">
              <div className="flex overflow-hidden rounded-2xl border-2 border-pink-100 bg-white focus-within:border-pink-400">
                <input value={linkSlug} onChange={e => setLinkSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40))} required placeholder="Ex.: ana" className="min-w-0 flex-1 px-4 py-4 text-base font-bold outline-none" />
                <span className="flex items-center bg-zinc-100 px-4 text-sm font-black text-zinc-400">ID {affiliate.id}</span>
              </div>
              <p className="mt-2 px-1 text-xs font-semibold text-zinc-400">Seu link: <span className="text-zinc-500">shecoisademulher.com/{linkSlug || 'ana'}{affiliate.id}</span></p>
              {linkMessage && <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">{linkMessage}</p>}
              <button disabled={linkBusy || !linkSlug.trim()} className="mt-4 w-full rounded-2xl bg-pink-500 py-4 font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50">{linkBusy ? 'Criando seu link…' : 'Criar meu link'}</button>
            </form>
          </section>
        )}

        <div className={!hasAffiliateLink ? 'pointer-events-none select-none grayscale opacity-40' : ''}>
        {!team.joined && Number(dashboard?.lifetimeSales || 0) === 0 && (
          <section className="mt-7 rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm md:p-6">
            {team.joined ? (
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Sua afiliada mãe</p>
                <div className="mt-2 flex items-center gap-3">
                  <div>
                    <p className="text-lg font-black text-zinc-950">{team.parent?.name || 'Afiliada mãe'}</p>
                    <p className="mt-1 text-xs text-zinc-400">Sua equipe é definida e não pode ser alterada.</p>
                  </div>
                  {team.parent?.whatsapp && <a href={whatsappUrl(team.parent.whatsapp)} target="_blank" rel="noreferrer" aria-label={`Falar com ${team.parent.name || 'sua afiliada mãe'} pelo WhatsApp`} className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm hover:opacity-90"><svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.55 0 .24 5.31.24 11.84c0 2.09.55 4.13 1.59 5.93L.13 24l6.38-1.67a11.8 11.8 0 0 0 5.57 1.42h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.13-3.41-8.43ZM12.09 21.8h-.01a9.91 9.91 0 0 1-5.05-1.39l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.9 9.9 0 0 1-1.52-5.28C2.14 6.37 6.6 1.91 12.08 1.91c2.65 0 5.14 1.03 7.01 2.9a9.86 9.86 0 0 1 2.91 7.02c0 5.48-4.46 9.94-9.91 9.97Zm5.44-7.45c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.12 4.52.72.31 1.28.5 1.72.64.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.44.25-.71.25-1.32.18-1.44-.07-.12-.27-.2-.57-.35Z" /></svg></a>}
                </div>
              </div>
            ) : team.canJoin && (
              <>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">Equipe</p>
                <h2 className="mt-1 text-xl font-black text-zinc-950">Entre em uma equipe</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-500">Entre em uma equipe e qualifique como bronze por 30 dias corridos.</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">Digite o ID de quem indicou você ou encontre uma afiliada mãe disponível. Antes de entrar, você poderá conferir os dados e aceitar as condições do vínculo.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <form onSubmit={joinTeam} className="flex min-w-0 flex-1 gap-2">
                    <input value={teamCode} onChange={e => { setTeamCode(e.target.value.replace(/\D/g, '').slice(0, 12)); setTeamLookup(null); setTeamLookupMessage(''); setTeamJoinMessage('') }} disabled={teamJoinBusy || Boolean(teamReservation)} inputMode="numeric" placeholder="ID da afiliada mãe" className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm font-bold outline-none focus:border-pink-400" />
                    <button disabled={teamJoinBusy || teamLookupBusy || !teamCode || !teamLookup || Number(teamLookup.id) !== Number(teamCode)} className="rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Revisar e entrar</button>
                  </form>
                  <button type="button" onClick={findTeam} disabled={teamBoostBusy || Boolean(teamReservation)} className="rounded-xl border border-pink-200 bg-pink-50 px-4 py-2.5 text-sm font-black text-pink-600 disabled:cursor-not-allowed disabled:opacity-40">{teamBoostBusy ? 'Buscando…' : 'Encontrar uma equipe'}</button>
                </div>
                {teamCode && !teamReservation && (
                  <div className={`mt-3 rounded-xl border px-3 py-2.5 text-xs ${teamLookup ? 'border-pink-200 bg-pink-50 text-zinc-700' : 'border-zinc-100 bg-zinc-50 text-zinc-500'}`} aria-live="polite">
                    {teamLookupBusy ? 'Buscando afiliada pelo ID…' : teamLookup ? <>Sua afiliada mãe será: <strong className="text-zinc-950">{teamLookup.name}</strong> <span className="text-zinc-400">(ID {teamLookup.id})</span></> : teamLookupMessage || 'Digite o ID para localizar a afiliada mãe.'}
                  </div>
                )}
                {teamReservation && !teamConfirmOpen && <div className="mt-3 flex flex-col gap-2 rounded-xl border border-pink-100 bg-pink-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold text-zinc-700">Sua afiliada mãe será: <strong>{teamReservation.parentName}</strong></p><button type="button" onClick={() => openTeamConfirmation({ id: teamReservation.parentId, parentId: teamReservation.parentId, name: teamReservation.parentName, parentName: teamReservation.parentName, whatsapp: teamReservation.parentWhatsapp || '', parentWhatsapp: teamReservation.parentWhatsapp || '' }, 'boost')} className="rounded-lg bg-pink-500 px-3 py-2 text-xs font-black text-white">Revisar seleção</button></div>}
                {teamJoinMessage && <p className="mt-2 text-xs font-semibold text-zinc-500">{teamJoinMessage}</p>}
                {teamBoostMessage && <p className="mt-2 text-xs font-semibold text-zinc-500">{teamBoostMessage}</p>}
              </>
            )}
          </section>
        )}

        <section className={`relative mt-7 overflow-hidden rounded-[2rem] border border-white bg-gradient-to-r ${levelTone(level.key)} p-5 shadow-sm md:p-7`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-400">Qualificação Mensal</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className={`text-3xl font-black ${levelAccent(level.key)}`}>{level.label}</h2>
                <span className="text-sm font-bold text-zinc-600">{monthlyLevel.sales} vendas pessoais + equipe</span>
                <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-zinc-800">{brl(level.commissionPerOrder)} / pedido</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {monthlyLevel.nextLevel
                  ? `Faltam ${monthlyLevel.salesToNext} venda(s) para ${monthlyLevel.nextLevel}.`
                  : 'Você atingiu o nível máximo deste mês.'}
              </p>
            </div>
            <div className="min-w-[220px] text-right">
              <p className="text-xs font-bold text-zinc-400">PROGRESSO</p>
              <p className="mt-1 text-2xl font-black text-zinc-900">{Math.round(Math.max(monthlyLevel.progress, level.progress))}%</p>
            </div>
          </div>

          <div className="relative mx-auto mt-8 h-[92px] w-[82%] max-w-[520px] px-0">
            <div className="absolute left-0 right-0 top-4 h-4 overflow-hidden rounded-full bg-zinc-200/80">
              <div className="absolute inset-y-0 left-0 bg-zinc-400 transition-all duration-700" style={{ width: `${Math.min(100, Math.max(0, Math.min(Math.max(monthlyLevel.progress, level.progress), 10)))}%` }} />
              <div className="absolute inset-y-0 left-[10%] bg-orange-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(40, Math.max(monthlyLevel.progress, level.progress) - 10))}%` }} />
              <div className="absolute inset-y-0 left-[50%] bg-zinc-500 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(40, Math.max(monthlyLevel.progress, level.progress) - 50))}%` }} />
              <div className="absolute inset-y-0 left-[90%] bg-amber-400 transition-all duration-700" style={{ width: `${Math.max(0, Math.min(10, Math.max(monthlyLevel.progress, level.progress) - 90))}%` }} />
            </div>


            {[
              { label: 'Bronze', min: Number(config.monthlyLevels?.bronze || 10), image: '/badge-bronze.svg', rate: brl(dashboard?.monthlyCommissionRates?.bronze ?? config.commissions?.bronze), tone: 'text-[#9a5a22]' },
              { label: 'Prata', min: Number(config.monthlyLevels?.silver || 50), image: '/badge-silver.svg', rate: brl(dashboard?.monthlyCommissionRates?.silver ?? config.commissions?.silver), tone: 'text-zinc-500' },
              { label: 'Ouro', min: Number(config.monthlyLevels?.gold || 101), image: '/badge-gold.svg', rate: brl(dashboard?.monthlyCommissionRates?.gold ?? config.commissions?.gold), tone: 'text-amber-600' },
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

        <section className={`relative mt-5 overflow-hidden rounded-[2rem] border border-white bg-gradient-to-r ${levelTone(fixedLevel.key)} p-5 shadow-sm md:p-7`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-400">Qualificação Permanente</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className={`text-3xl font-black ${levelAccent(fixedLevel.key)}`}>{fixedLevel.label}</h2>
                <span className="text-sm font-bold text-zinc-600">{fixedLevel.sales} vendas pessoais</span>
              </div>
              <p className="mt-2 text-sm text-zinc-500">
                {fixedLevel.nextLevel ? `Faltam ${fixedLevel.salesToNext} venda(s) pessoal(is) para ${fixedLevel.nextLevel}.` : 'Você atingiu a qualificação permanente máxima.'}
              </p>
            </div>
            <div className="min-w-[220px] text-right">
              <p className="text-xs font-bold text-zinc-400">PROGRESSO ACUMULADO</p>
              <p className="mt-1 text-2xl font-black text-zinc-900">{Math.round(fixedProgress)}%</p>
            </div>
          </div>
          <div className="relative mx-auto mt-8 h-[92px] w-[82%] max-w-[520px] px-0">
            <div className="absolute left-0 right-0 top-4 h-4 overflow-hidden rounded-full bg-zinc-200/80">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-zinc-400 via-orange-400 via-zinc-500 to-amber-400 transition-all duration-700" style={{ width: `${Math.min(100, fixedProgress)}%` }} />
            </div>
            {[
              { label: 'Bronze', min: Number(config.fixedLevels?.bronze || 50), image: '/badge-bronze.svg', tone: 'text-[#9a5a22]' },
              { label: 'Prata', min: Number(config.fixedLevels?.silver || 300), image: '/badge-silver.svg', tone: 'text-zinc-500' },
              { label: 'Ouro', min: Number(config.fixedLevels?.gold || 500), image: '/badge-gold.svg', tone: 'text-amber-600' },
            ].map(item => {
              const fixedMax = Number(config.fixedLevels?.gold || 500)
              const markerLeft = `${Math.min(100, Math.max(0, item.min / Math.max(1, fixedMax) * 100))}%`
              return <div key={item.label} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: markerLeft }}>
                <div className="mx-auto h-10 w-10 rounded-full border-2 border-white bg-white shadow-[0_5px_14px_rgba(0,0,0,.14)] sm:h-12 sm:w-12"><img src={item.image} alt={`Broche ${item.label}`} className="h-full w-full object-contain" /></div>
                <div className={`mt-1 whitespace-nowrap text-[8px] font-black uppercase tracking-wider sm:text-[9px] ${item.tone}`}>{item.label}</div>
                <div className="mt-1 text-[8px] font-black text-zinc-400 sm:text-[9px]">{item.min} vendas</div>
              </div>
            })}
          </div>
          <button type="button" aria-label="Como funciona a Qualificação Permanente" onClick={() => setFixedHelpOpen(true)} className="absolute bottom-4 right-5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-xs font-black text-zinc-500 shadow-sm transition hover:border-pink-300 hover:text-pink-500">?</button>
        </section>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="w-full sm:w-64">
            <label htmlFor="affiliate-month-filter" className="mb-2 block text-[10px] font-black uppercase tracking-[.16em] text-zinc-400">Filtrar indicadores por mês</label>
            <select id="affiliate-month-filter" value={selectedMonth} onChange={event => changeSelectedMonth(event.target.value)} className="w-full rounded-xl border border-pink-100 bg-white px-4 py-3 text-sm font-bold text-zinc-800 outline-none focus:border-pink-400">
              <option value="all">Todos os meses</option>
              {[...months].sort((a, b) => b.localeCompare(a)).map(month => <option key={month} value={month}>{monthLabel(month)}</option>)}
            </select>
          </div>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => {
            const multiplierActive = label === 'Ticket médio' && dashboard?.metrics?.ticketMultiplierActive
            return (
              <div key={label} className={`relative rounded-[1.5rem] p-5 border shadow-sm transition-all ${multiplierActive ? 'border-amber-300 bg-gradient-to-br from-amber-100 via-yellow-50 to-white shadow-[0_0_35px_rgba(245,158,11,.28)]' : 'border-pink-100 bg-white'}`}>
                <p className={`text-xs uppercase tracking-[.18em] ${multiplierActive ? 'text-amber-700' : 'text-zinc-400'}`}>{label}</p>
                <p className={`mt-3 text-2xl font-black ${multiplierActive ? 'text-amber-900' : 'text-zinc-950'}`}>{value}</p>
                {multiplierActive && <span className="mt-2 inline-flex rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-black text-amber-800">+ {brl(dashboard?.metrics?.ticketMultiplierValue ?? config.ticketBonus)} / pedido</span>}
                {label === 'Ticket médio' && <p className={`mt-2 text-[10px] leading-4 ${multiplierActive ? 'text-amber-700' : 'text-zinc-400'}`}>Ticket médio deste período acima de {brl(dashboard?.metrics?.ticketMultiplierThreshold ?? config.ticketThreshold)} ativa + {brl(dashboard?.metrics?.ticketMultiplierValue ?? config.ticketBonus)} por pedido.</p>}
              </div>
            )
          })}
        </section>

        <section className="mt-6 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div className="order-1 self-start w-full min-w-0 rounded-[1.5rem] bg-white p-5 border border-pink-100 shadow-sm lg:col-start-1 lg:row-start-1">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-black text-xl">Desempenho mensal</h2>
                <p className="mt-1 text-sm text-zinc-400">Quantidade de vendas em cada mês. O mês atual continua acumulando até fechar.</p>
              </div>
              <div className="hidden sm:block text-right text-xs text-zinc-400">Evolução mês a mês</div>
            </div>

            <div ref={chartScrollRef} className="mt-4 h-[155px] w-full overflow-x-auto overflow-y-hidden rounded-xl bg-white pb-2 overscroll-x-contain scroll-smooth">
              <div className="h-[135px] min-w-[520px] px-1">
                <div className="flex h-[118px] items-end gap-1 border-b border-zinc-100 pt-[22px]">
                  {chart.map((item) => {
                    const sales = Number(item.sales || 0)
                    const height = sales ? Math.max(8, (sales / chartScaleMax) * chartBarAreaHeight) : 3
                    return (
                      <div key={item.date} data-chart-index={chart.indexOf(item)} className="group flex h-full min-w-[72px] flex-1 flex-col justify-end">
                        <div className="relative flex flex-1 items-end justify-center">
                          {sales > 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-zinc-700" style={{ bottom: `${height + 5}px` }}>{sales}</span>}
                          <div title={`${item.label || monthLabel(item.date)} — ${sales} venda(s)`} className="w-[18px] rounded-t-md bg-pink-400 transition-all duration-300 group-hover:bg-pink-500" style={{ height: `${height}px`, minHeight: sales ? undefined : '3px' }} />
                        </div>
                        <span className="mt-2 text-center text-[8px] font-bold text-zinc-400">{item.label || monthLabel(item.date)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-1 text-center text-[10px] text-zinc-400 sm:hidden">Deslize para ver os meses anteriores</p>
          </div>

          <div className="order-2 rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm lg:col-start-2 lg:row-start-1">
              <h2 className="font-black text-xl">Saldo e saque pessoal</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Comissão total acumulada</p>
                  <p className="mt-1 text-xl font-black text-zinc-950">{brl(dashboard?.metrics?.totalCommission ?? dashboard?.metrics?.earnedCommission ?? 0)}</p>
                  <p className="mt-1 text-[11px] text-zinc-400">Todos os meses, sem descontar movimentações</p>
                </div>
                <div className="rounded-2xl border border-pink-100 bg-pink-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-pink-500">Saldo disponível</p>
                  <p className="mt-1 text-xl font-black text-zinc-950">{brl(availableCommission)}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">Após reservas de saques e impulsos</p>
                </div>
              </div>
              <form onSubmit={requestWithdraw} className="mt-5">
                <input
                  value={withdrawAmount}
                  onChange={e => setWithdrawAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 100"
                  className="w-full rounded-2xl border border-zinc-200 px-4 py-3.5 text-lg font-bold outline-none focus:border-pink-400"
                />
                <button disabled={withdrawBusy || !canWithdrawThisMonth} className="mt-3 w-full rounded-2xl bg-zinc-950 py-4 text-base font-black text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:opacity-100">
                  {withdrawBusy ? 'Enviando…' : 'Solicitar saque'}
                </button>
              </form>
              <p className="mt-3 text-xs leading-5 text-zinc-400">Saque mínimo de R$ 100,00. Os pedidos devem ser feitos em múltiplos de R$ 100,00. Para liberar o saque, é necessário ter pelo menos 1 venda pessoal contabilizada neste mês.</p>
              {withdrawMessage && <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">{withdrawMessage}</p>}
          </div>

          <div className="order-3 rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm lg:col-start-1 lg:row-start-2">
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
                  <label className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Tipo da chave PIX</label>
                  <select
                    value={pixKeyType}
                    onChange={e => setPixKeyType(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 text-sm font-bold outline-none focus:border-pink-400"
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                    <option value="EMAIL">E-mail</option>
                    <option value="PHONE">Telefone</option>
                    <option value="EVP">Chave aleatória</option>
                  </select>
                  <label className="mt-3 block text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Nova chave PIX</label>
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

          <div className="order-4 rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm lg:col-start-2 lg:row-start-2">
              <h2 className="font-black text-xl">Seu link</h2>
              <p className="mt-2 text-sm text-zinc-500">Compartilhe sua página exclusiva.</p>
              <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm font-semibold break-all">{publicUrl}</div>
              <button onClick={() => navigator.clipboard?.writeText(publicUrl)} className="mt-3 w-full rounded-xl bg-pink-500 py-3 font-bold text-white">Copiar link</button>
              <img src={qrUrl} alt="QR Code da afiliada" className="mx-auto mt-5 h-44 w-44 rounded-xl border border-zinc-100 p-2" />
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          {team.joined && team.parent && (
            <div className="mb-5 rounded-2xl border border-pink-100 bg-pink-50/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-[.18em] text-pink-500">Sua afiliada mãe</p>
              <div className="mt-2 flex items-center gap-3"><p className="text-lg font-black text-zinc-950">{team.parent.name}</p>{team.parent.whatsapp && <a href={whatsappUrl(team.parent.whatsapp)} target="_blank" rel="noreferrer" aria-label={`Falar com ${team.parent.name} pelo WhatsApp`} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.55 0 .24 5.31.24 11.84c0 2.09.55 4.13 1.59 5.93L.13 24l6.38-1.67a11.8 11.8 0 0 0 5.57 1.42h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.13-3.41-8.43ZM12.09 21.8h-.01a9.91 9.91 0 0 1-5.05-1.39l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.9 9.9 0 0 1-1.52-5.28C2.14 6.37 6.6 1.91 12.08 1.91c2.65 0 5.14 1.03 7.01 2.9a9.86 9.86 0 0 1 2.91 7.02c0 5.48-4.46 9.94-9.91 9.97Zm5.44-7.45c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.12 4.52.72.31 1.28.5 1.72.64.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.44.25-.71.25-1.32.18-1.44-.07-.12-.27-.2-.57-.35Z" /></svg></a>}</div>
            </div>
          )}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Equipe</p>
              <h2 className="mt-1 text-2xl font-black text-zinc-950">Sua rede</h2>
              <p className="mt-1 text-sm text-zinc-500">Passe seu ID para novas afiliadas entrarem diretamente na sua equipe.</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2"><span className="text-xs font-bold text-zinc-500">Seu ID</span><span className="text-lg font-black tracking-[.08em] text-pink-600">{affiliate.id}</span></div>
            </div>
            <div className="grid gap-2 sm:min-w-[320px] sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Vendas da equipe</p>
                <p className="mt-1 text-xl font-black text-zinc-950">{team.sales || 0}</p>
                <p className="mt-1 text-xs text-zinc-400">Somatória das vendas das afiliadas diretamente na sua equipe.</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Comissão de equipe</p>
                <p className="mt-1 text-xl font-black text-zinc-950">{brl(team.commissionPerSale)} / venda</p>
                <p className="mt-1 text-xs text-zinc-400">Gerada pelas afiliadas diretamente na sua equipe.</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Comissão gerada</p><p className="mt-1 text-2xl font-black text-zinc-950">{brl(team.earnedCommission)}</p></div>
            <div className="rounded-2xl border border-pink-100 bg-pink-50/60 p-4"><p className="text-[10px] font-black uppercase tracking-[.15em] text-pink-500">Saldo de Equipe</p><p className="mt-1 text-2xl font-black text-zinc-950">{brl(team.availableCommission)}</p></div>
          </div>

          <div className="mt-5">
            <label htmlFor="team-member-search" className="mb-2 block text-xs font-black uppercase tracking-[.12em] text-zinc-500">Pesquisar afiliada por nome ou ID</label>
            <input
              id="team-member-search"
              type="search"
              value={teamSearch}
              onChange={event => setTeamSearch(event.target.value)}
              placeholder="Digite o nome ou ID da afiliada..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
            />
          </div>
          <div className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-zinc-100">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 z-10 bg-white"><tr className="border-b border-zinc-100 text-left text-[10px] font-black uppercase tracking-[.14em] text-zinc-400"><th className="pb-3">Afiliada</th><th className="pb-3">ID</th><th className="pb-3">Vendas</th><th className="pb-3">Comissão gerada</th></tr></thead>
              <tbody>{filteredTeamMembers.map(member => <tr key={member.id} className="border-b border-zinc-100 last:border-0"><td className="py-3 font-black"><div className="flex items-center gap-2"><a href={whatsappUrl(member.whatsapp) || '#'} target={member.whatsapp ? '_blank' : undefined} rel={member.whatsapp ? 'noreferrer' : undefined} aria-label={member.whatsapp ? `Falar com ${member.name} pelo WhatsApp` : undefined} className={member.whatsapp ? 'text-[#25D366] transition-opacity hover:opacity-70' : 'pointer-events-none text-zinc-200'}><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.55 0 .24 5.31.24 11.84c0 2.09.55 4.13 1.59 5.93L.13 24l6.38-1.67a11.8 11.8 0 0 0 5.57 1.42h.01c6.53 0 11.84-5.31 11.84-11.84 0-3.16-1.23-6.13-3.41-8.43ZM12.09 21.8h-.01a9.91 9.91 0 0 1-5.05-1.39l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.9 9.9 0 0 1-1.52-5.28C2.14 6.37 6.6 1.91 12.08 1.91c2.65 0 5.14 1.03 7.01 2.9a9.86 9.86 0 0 1 2.91 7.02c0 5.48-4.46 9.94-9.91 9.97Zm5.44-7.45c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.12 4.52.72.31 1.28.5 1.72.64.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.44.25-.71.25-1.32.18-1.44-.07-.12-.27-.2-.57-.35Z"/></svg></a><div className="min-w-0"><span className="block">{member.name}</span><span className="mt-0.5 block text-[9px] font-black uppercase tracking-[.12em] text-zinc-400">{member.teamJoinSource === 'boost' ? 'Impulsionado' : 'Orgânico'}</span></div></div></td><td className="py-3 text-zinc-500">{member.id}</td><td className="py-3 font-bold">{member.sales}</td><td className="py-3 font-black text-pink-600">{brl(member.commission)}</td></tr>)}</tbody>
            </table>
            {!team.members?.length && <div className="py-6 text-center text-sm text-zinc-400">Nenhuma afiliada entrou na sua equipe ainda.</div>}
            {!!team.members?.length && !filteredTeamMembers.length && <div className="py-6 text-center text-sm text-zinc-400">Nenhuma afiliada encontrada para essa pesquisa.</div>}
          </div>



          <div className="mt-5 rounded-2xl border border-pink-100 bg-white p-4">
            <p className="text-sm font-black text-zinc-900">Sacar comissão de equipe</p>
            <p className="mt-1 text-xs text-zinc-400">Esse saldo é separado da sua bonificação pessoal. Saque mínimo de R$ 100,00, sempre em múltiplos de R$ 100,00. Para liberar o saque, é necessário ter pelo menos 1 venda pessoal contabilizada neste mês.</p>
            <form onSubmit={requestTeamWithdraw} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input value={teamWithdrawAmount} onChange={e => setTeamWithdrawAmount(e.target.value)} inputMode="decimal" placeholder="Ex.: 100" className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 font-bold outline-none focus:border-pink-400" />
              <button disabled={teamWithdrawBusy || team.availableCommission < 100 || !canWithdrawThisMonth} className="rounded-xl bg-pink-500 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:opacity-100">{teamWithdrawBusy ? 'Enviando…' : 'Solicitar saque de equipe'}</button>
            </form>
            {teamWithdrawMessage && <p className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">{teamWithdrawMessage}</p>}
          </div>

        {hasAffiliateLink && (
          <section className="mt-5 rounded-[1.5rem] border border-pink-100 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">🚀 Impulsionar Equipe</p>
                  <button type="button" onClick={() => setBoostHelpOpen(true)} aria-label="Como funciona o Impulsionar Equipe" className="flex h-5 w-5 items-center justify-center rounded-full border border-zinc-300 text-[11px] font-black text-zinc-500 transition hover:border-pink-300 hover:text-pink-500">?</button>
                </div>
                <h2 className="mt-1 text-xl font-black text-zinc-950">Receba novas afiliadas na sua equipe</h2>
                <p className="mt-1 text-xs leading-5 text-zinc-400">O sistema direciona novas afiliadas para você. Depois que o impulso for ativado, não há cancelamento nem reembolso. Enquanto estiver na fila, você pode sair e receber o saldo de volta.</p>
              </div>
              <div className="text-left lg:text-right"><p className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">Saldo disponível</p><p className="mt-1 text-xl font-black text-zinc-950">{brl(availableCommission)}</p></div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {(teamBoost?.plans || [{ key:'small', price:30, connections:5 }, { key:'large', price:50, connections:10 }]).map(plan => {
                const insufficient = availableCommission + 0.001 < Number(plan.price)
                const blockedByActive = teamBoost?.boost?.status === 'queued' || teamBoost?.boost?.status === 'active'
                const capacityFull = Number(teamBoost?.activeCount || 0) >= Number(teamBoost?.maxActive || 3)
                const visuallyQueued = capacityFull || insufficient || blockedByActive
                return <div key={plan.key} className={`rounded-2xl border p-4 ${visuallyQueued ? 'border-zinc-200 bg-zinc-100/80 text-zinc-400' : 'border-pink-100 bg-pink-50/50'}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className={`text-sm font-black ${visuallyQueued ? 'text-zinc-500' : 'text-zinc-950'}`}>{plan.connections} conexões</p><p className="mt-1 text-xs text-zinc-400">Impulsionamento automático</p></div><p className={`text-xl font-black ${visuallyQueued ? 'text-zinc-500' : 'text-pink-600'}`}>{brl(plan.price)}</p></div>
                  <button type="button" onClick={() => purchaseBoost(plan.key)} disabled={teamBoostBusy || insufficient || blockedByActive} className="mt-4 w-full rounded-xl bg-zinc-950 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-zinc-300">{blockedByActive ? (teamBoost?.boost?.status === 'queued' ? 'Já está na fila' : 'Impulso ativo') : insufficient ? 'Saldo insuficiente' : capacityFull ? 'Entrar na fila' : 'Impulsionar equipe'}</button>
                </div>
              })}
            </div>
            {teamBoost?.boost?.status === 'queued' && <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black text-amber-900">Você está na fila de impulsos.</p><p className="mt-1 text-xs leading-5 text-amber-800">Seu saldo está reservado. Quando chegar sua vez, o impulso será ativado automaticamente.</p><button type="button" onClick={leaveBoostQueue} disabled={teamBoostBusy} className="mt-3 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-amber-800 shadow-sm">Sair da fila e devolver saldo</button></div>}
            {teamBoost?.boost?.status === 'active' && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-black text-emerald-900">Impulso ativo</p><p className="mt-1 text-xs font-semibold text-emerald-800">{teamBoost.boost.connections_remaining} de {teamBoost.boost.connections_total} conexões restantes.</p></div>}
            {teamBoostMessage && <p className="mt-3 text-xs font-semibold text-zinc-500">{teamBoostMessage}</p>}
          </section>
        )}

        </section>


        <section className="relative mt-6 rounded-[1.5rem] border border-pink-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Conteúdo</p>
              <h2 className="mt-1 text-2xl font-black text-zinc-950">Divulgue seu vídeo</h2>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-2 text-xs font-black text-pink-600">Envio para análise</span>
          </div>

          <form onSubmit={event => { event.preventDefault(); setVideoMessage(''); if (!videoUrl.trim()) { setVideoMessage('Informe o link do vídeo.'); return } setVideoTermsAccepted(false); setVideoTermsOpen(true) }} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} type="url" placeholder="Cole aqui o link do vídeo publicado" className="min-w-0 flex-1 rounded-2xl border border-zinc-200 px-4 py-3.5 text-sm outline-none focus:border-pink-400" />
            <button disabled={videoBusy || !videoUrl.trim()} className="rounded-2xl bg-zinc-950 px-6 py-3.5 font-black text-white transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40">Enviar</button>
          </form>
          {videoMessage && <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-600">{videoMessage}</p>}

          <div className="mt-5 space-y-3">
            {videoSubmissions.map(item => (
              <div key={item.id} className="rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0"><p className="text-xs font-black uppercase tracking-[.14em] text-zinc-400">Solicitação #{item.id}</p><p className="mt-1 truncate text-sm font-bold text-zinc-700">{item.video_url}</p><p className="mt-1 text-xs text-zinc-400">Enviado em {new Date(item.created_at).toLocaleDateString('pt-BR')}</p></div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${item.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{item.status === 'approved' ? 'Aprovado' : item.status === 'rejected' ? 'Rejeitado' : 'Pendente'}</span>
                </div>
                {item.note && <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-zinc-600"><strong>Observação da SHE:</strong> {item.note}</p>}
              </div>
            ))}
            {!videoSubmissions.length && <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-400">Você ainda não enviou nenhum vídeo para análise.</div>}
          </div>
          <button type="button" aria-label="Como funciona a divulgação de vídeos" onClick={() => setVideoHelpOpen(true)} className="absolute bottom-4 right-5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-xs font-black text-zinc-500 shadow-sm transition hover:border-pink-300 hover:text-pink-500">?</button>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-white p-6 border border-pink-100 overflow-x-auto shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Pedidos atribuídos</h2>
              <p className="mt-1 text-sm text-zinc-400">Todos os pedidos aprovados</p>
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
          {!dashboard?.orders?.length && <div className="py-10 text-center text-sm text-zinc-400">Nenhuma venda aprovada ainda.</div>}
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-white p-6 border border-pink-100 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-black text-xl">Movimentações de saldo</h2>
              <p className="mt-1 text-sm text-zinc-400">Solicitações de saque de todo o período.</p>
            </div>
            <span className="rounded-full bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-500">{(dashboard?.movements || []).length} movimentação(ões)</span>
          </div>

          <div className="mt-5 max-h-[500px] space-y-3 overflow-y-auto pr-1">
            {[...(dashboard?.movements || [])]
              .sort((a, b) => {
                const dateA = new Date(a.date || a.requested_at || a.created_at || 0).getTime();
                const dateB = new Date(b.date || b.requested_at || b.created_at || 0).getTime();
                const safeA = Number.isFinite(dateA) ? dateA : 0;
                const safeB = Number.isFinite(dateB) ? dateB : 0;
                return safeB - safeA || String(b.id || '').localeCompare(String(a.id || ''));
              })
              .map(movement => (
              <div key={movement.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${movement.kind === 'boost' ? 'bg-emerald-100 text-emerald-600' : 'bg-pink-100 text-pink-600'}`}>{movement.kind === 'boost' ? '↗' : '↗'}</div>
                  <div>
                    <p className="font-black text-zinc-900">{movement.kind === 'boost' ? 'Impulso de Equipe' : `Solicitação de Saque ${movement.source === 'team' ? '· Equipe' : '· Pessoal'}`}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{new Date(movement.date).toLocaleDateString('pt-BR')}</p>
                    {movement.kind === 'withdrawal' && movement.status === 'rejected' && (
                       <p className="mt-1 max-w-xl text-xs font-semibold leading-5 text-red-600"><strong>Motivo da recusa:</strong> {movement.withdrawal?.note || 'Solicitação de saque recusada.'}</p>
                     )}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-lg font-black text-zinc-950">{brl(movement.amount)}</span>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-black ${movement.kind === 'boost' ? (movement.status === 'active' ? 'bg-emerald-100 text-emerald-800' : movement.status === 'cancelled' ? 'bg-zinc-200 text-zinc-700' : movement.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800') : (movement.status === 'pending' ? 'bg-amber-100 text-amber-800' : movement.status === 'processing' ? 'bg-blue-100 text-blue-800' : movement.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : movement.status === 'failed' || movement.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-zinc-200 text-zinc-700')}`}>
                    {movement.kind === 'boost' ? boostStatusLabel(movement.status) : withdrawalStatusLabel(movement.status)}
                  </span>
                </div>
              </div>
            ))}
            {!dashboard?.movements?.length && (
              <div className="rounded-2xl border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-400">Nenhuma movimentação ainda.</div>
            )}
          </div>
        </section>

        <footer className="relative mt-10 overflow-hidden rounded-[2rem] bg-[#0b0b0d] px-6 pt-12 pb-7 text-white shadow-sm md:px-10">
          <div className="absolute -top-32 left-1/2 h-[260px] w-[620px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_top,#3A1835_0%,#170D16_42%,rgba(9,8,10,0)_78%)] blur-[80px] pointer-events-none" />
          <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <p className="text-lg font-black">She</p>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/55">Programa de afiliadas SHE. Uma parceria comercial independente para divulgação dos nossos produtos.</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-pink-300">Navegue</p>
              <nav className="mt-4 flex flex-col gap-3 text-sm text-white/70">
                <Link to="/afiliado" className="hover:text-white transition-colors">Área da Afiliada</Link>
                <Link to="/representantes" className="hover:text-white transition-colors">Representantes</Link>
              </nav>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-pink-300">Legal</p>
              <nav className="mt-4 flex flex-col gap-3 text-sm text-white/70">
                <Link to="/termos-afiliadas" className="hover:text-white transition-colors">Termos de Afiliadas</Link>
                <Link to="/politica-de-privacidade" className="hover:text-white transition-colors">Política de Privacidade</Link>
                <Link to="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link>
              </nav>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-pink-300">Contato</p>
              <a href="https://wa.me/553132784332" target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-white/70 hover:text-white transition-colors">Fale com a gente</a>
            </div>
          </div>
          <div className="relative mt-10 border-t border-white/10 pt-5 text-xs text-white/35">© {new Date().getFullYear()} She. Todos os direitos reservados.</div>
        </footer>
      </div>


      {profileOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-5 py-8" onMouseDown={event => { if (event.target === event.currentTarget && !profileBusy) setProfileOpen(false) }}>
            <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.25)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">Minha conta</p>
                  <h3 className="mt-1 text-2xl font-black text-zinc-950">Meus Dados</h3>
                  <p className="mt-1 text-sm text-zinc-400">Confira e altere seus dados de cadastro.</p>
                </div>
                <button type="button" disabled={profileBusy} onClick={() => setProfileOpen(false)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-500 disabled:opacity-50">×</button>
              </div>

              <form onSubmit={saveProfile} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">E-mail</span>
                    <input value={profileForm.email} onChange={e => setProfileForm(current => ({ ...current, email: e.target.value }))} type="email" required autoComplete="email" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-pink-400" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">CPF</span>
                    <input value={profileForm.cpf} onChange={e => setProfileForm(current => ({ ...current, cpf: e.target.value.replace(/\D/g, '').slice(0, 11) }))} inputMode="numeric" maxLength={11} required className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-pink-400" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-black uppercase tracking-[.15em] text-zinc-400">WhatsApp</span>
                    <input value={profileForm.whatsapp} onChange={e => setProfileForm(current => ({ ...current, whatsapp: e.target.value }))} type="tel" required autoComplete="tel" className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-pink-400" />
                  </label>
                </div>

                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-sm font-black text-zinc-900">Alterar senha</p>
                  <p className="mt-1 text-xs text-zinc-400">Deixe em branco para manter a senha atual.</p>
                  <input value={profileForm.password} onChange={e => setProfileForm(current => ({ ...current, password: e.target.value }))} type="password" minLength={8} autoComplete="new-password" placeholder="Nova senha (mín. 8 caracteres)" className="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-semibold outline-none focus:border-pink-400" />
                </div>

                {profileMessage && <p className="rounded-xl bg-zinc-50 px-3 py-2.5 text-xs font-semibold text-zinc-600">{profileMessage}</p>}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" disabled={profileBusy} onClick={() => setProfileOpen(false)} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-600 disabled:opacity-50">Fechar</button>
                  <button type="submit" disabled={profileBusy} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500 disabled:opacity-50">{profileBusy ? 'Salvando…' : 'Salvar alterações'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      {videoTermsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-5 py-8" onMouseDown={event => { if (event.target === event.currentTarget && !videoBusy) setVideoTermsOpen(false) }}>
          <div role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.3)]">
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Termos e Condições · versão 1.0</p><h3 className="mt-1 text-2xl font-black text-zinc-950">Autorização de uso do vídeo</h3></div><button type="button" disabled={videoBusy} onClick={() => setVideoTermsOpen(false)} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-500">×</button></div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
              <p>Ao aceitar, você declara que possui os direitos necessários sobre o vídeo enviado ou autorização suficiente para conceder esta licença à SHE.</p>
              <p>Você autoriza a SHE, de forma gratuita, a reproduzir, publicar, editar, cortar, adaptar, legendar, redimensionar e divulgar o vídeo em canais próprios e em campanhas de tráfego pago, inclusive utilizando o seu link de afiliada para atribuição das vendas.</p>
              <p>A autorização inclui o uso do vídeo em anúncios, redes sociais, páginas, criativos e outros formatos de divulgação relacionados à SHE, pelo período em que a SHE considerar necessário para suas ações de marketing.</p>
              <p>Você declara ser responsável por obter as autorizações de qualquer pessoa, música, imagem, marca ou outro material de terceiros presente no vídeo. Caso exista alguma restrição, você deve informá-la antes do envio.</p>
              <p>A aprovação não obriga a SHE a utilizar o vídeo. A SHE poderá interromper ou retirar a divulgação a qualquer momento, sem obrigação de pagamento adicional, royalties ou indenização pelo uso autorizado.</p>
              <p>Você permanece livre para manter e utilizar o vídeo em seus próprios canais, salvo se houver obrigação diferente decorrente de direitos de terceiros.</p>
              <p>Você concorda que o aceite destes termos, associado ao seu cadastro e à data/hora do envio, será registrado para comprovar a autorização concedida.</p>
            </div>
            <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-pink-100 bg-pink-50/60 p-4"><input type="checkbox" checked={videoTermsAccepted} onChange={e => setVideoTermsAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-pink-500" /><span className="text-sm font-bold leading-5 text-zinc-700">Li e aceito integralmente os Termos e Condições para publicação e divulgação do vídeo.</span></label>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={videoBusy} onClick={() => setVideoTermsOpen(false)} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-600">Cancelar</button><button type="button" disabled={!videoTermsAccepted || videoBusy} onClick={submitVideo} className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{videoBusy ? 'Enviando…' : 'Aceitar e enviar'}</button></div>
          </div>
        </div>
      )}

      {videoHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 py-8 backdrop-blur-[2px]" onMouseDown={() => setVideoHelpOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="video-help-title" className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.22)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Divulgue seu vídeo</p>
                <h3 id="video-help-title" className="mt-1 text-xl font-black text-zinc-950">Como funciona</h3>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setVideoHelpOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-black text-zinc-500 transition hover:bg-pink-50 hover:text-pink-500">×</button>
            </div>
            <div className="mt-5 text-sm leading-6 text-zinc-600">
              <p>Crie e publique seu vídeo, depois envie o link aqui. A She vai analisar. Se aprovado, poderemos usar o vídeo em divulgação usando o seu link, ajudando a gerar vendas para você sem custo de mídia para a afiliada.</p>
            </div>
            <button type="button" onClick={() => setVideoHelpOpen(false)} className="mt-6 w-full rounded-xl bg-zinc-950 py-3 font-black text-white transition hover:bg-pink-500">Entendi</button>
          </div>
        </div>
      )}

        </div>

      {teamConfirmOpen && teamConfirmParent && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[3px]" onMouseDown={event => { if (event.target === event.currentTarget) closeTeamConfirmation() }}>
          <div role="dialog" aria-modal="true" aria-labelledby="team-confirm-title" className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[1.8rem] bg-white p-5 shadow-[0_30px_100px_rgba(0,0,0,.28)] sm:p-7" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Confirmação de equipe</p><h3 id="team-confirm-title" className="mt-1 text-2xl font-black text-zinc-950">Conheça sua afiliada mãe</h3><p className="mt-1 text-sm leading-5 text-zinc-500">Confira os dados e aceite as condições antes de confirmar sua entrada.</p></div>
              <button type="button" aria-label="Fechar confirmação" onClick={closeTeamConfirmation} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-black text-zinc-500 hover:bg-pink-50 hover:text-pink-600">×</button>
            </div>

            <div className="mt-5 rounded-[1.4rem] border border-pink-100 bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-pink-100 bg-white text-xl font-black text-pink-500 shadow-sm">{String(teamConfirmParent.name || teamConfirmParent.parentName || 'A').trim().charAt(0).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.16em] text-pink-500">Sua afiliada mãe será</p><h4 className="mt-1 break-words text-lg font-black text-zinc-950">{teamConfirmParent.name || teamConfirmParent.parentName || 'Afiliada SHE'}</h4><p className="mt-0.5 text-xs font-semibold text-zinc-400">ID {teamConfirmParent.id || teamConfirmParent.parentId}</p></div>
              </div>
              <div className="mt-4 rounded-xl border border-white bg-white/90 p-3">
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-zinc-400">Contato da afiliada mãe</p>
                {(teamConfirmParent.whatsapp || teamConfirmParent.parentWhatsapp) ? (
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-bold text-zinc-700">{formatWhatsapp(teamConfirmParent.whatsapp || teamConfirmParent.parentWhatsapp)}</span><a href={whatsappUrl(teamConfirmParent.whatsapp || teamConfirmParent.parentWhatsapp)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-black text-white shadow-sm hover:opacity-90"><svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true"><path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.55 0 .24 5.31.24 11.84c0 2.09.55 4.13 1.59 5.93L.13 24l6.38-1.67a11.8 11.8 0 0 0 5.57 1.42h.01c6.53 0 11.84-5.31 11.84-11.84c0-3.16-1.23-6.13-3.41-8.43ZM12.09 21.8h-.01a9.91 9.91 0 0 1-5.05-1.39l-.36-.21-3.79.99 1.01-3.69-.23-.38a9.9 9.9 0 0 1-1.52-5.28C2.14 6.37 6.6 1.91 12.08 1.91c2.65 0 5.14 1.03 7.01 2.9a9.86 9.86 0 0 1 2.91 7.02c0 5.48-4.46 9.94-9.91 9.97Zm5.44-7.45c-.3-.15-1.78-.88-2.05-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.94 1.18-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.51-1.78-1.69-2.08-.18-.3-.02-.37.13-.52.13-.17.45-.5.52-.67.07-.17.1-.3.15-.45.05-.15-.02-.37-.07-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.51-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.11 3.22 5.12 4.52.72.31 1.37.47 1.72.64.72.23 1.37.2 1.89.12.58-.09 1.78-.73 2.03-1.44.25-.71.18-1.32.18-1.44-.07-.12-.27-.2-.57-.35Z"/></svg>Conversar no WhatsApp</a></div>
                ) : <p className="mt-2 text-sm text-zinc-500">A afiliada ainda não informou um WhatsApp de contato.</p>}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-[1.2rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
              <img src="/badge-bronze.svg" alt="Broche Bronze" className="h-14 w-14 shrink-0 object-contain drop-shadow-sm" />
              <div><p className="text-[10px] font-black uppercase tracking-[.17em] text-amber-700">Benefício de entrada</p><p className="mt-1 text-lg font-black leading-tight text-zinc-950">Ganhe 30 dias de Qualificação Bronze</p><p className="mt-1 text-xs leading-5 text-zinc-600">O prazo é de 30 dias corridos, contados a partir da confirmação da entrada na equipe.</p></div>
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-xs font-black uppercase tracking-[.15em] text-zinc-500">Leia e confirme as condições</p>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3.5 transition hover:border-pink-200 hover:bg-pink-50/40"><input type="checkbox" checked={teamWhatsappConsent} onChange={event => setTeamWhatsappConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-pink-500" /><span className="text-sm leading-5 text-zinc-700">Aceito que a afiliada mãe poderá entrar em contato comigo por WhatsApp.</span></label>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3.5 transition hover:border-pink-200 hover:bg-pink-50/40"><input type="checkbox" checked={teamFixedTeamConsent} onChange={event => setTeamFixedTeamConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-pink-500" /><span className="text-sm leading-5 text-zinc-700">Tenho ciência de que, depois de entrar em uma equipe, não poderei sair dela nem trocar de afiliada mãe.</span></label>
            </div>

            <p className="mt-4 text-xs leading-5 text-zinc-400">Ao confirmar, você declara que conferiu os dados acima e concorda com as duas condições para entrar na equipe.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={teamJoinBusy} onClick={closeTeamConfirmation} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-600 disabled:opacity-50">Voltar</button><button type="button" disabled={teamJoinBusy || !teamWhatsappConsent || !teamFixedTeamConsent} onClick={confirmTeamJoin} className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-pink-100 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-40">{teamJoinBusy ? 'Confirmando…' : 'Aceitar e entrar na equipe'}</button></div>
            {!teamWhatsappConsent || !teamFixedTeamConsent ? <p className="mt-3 text-center text-[11px] font-semibold text-zinc-400">Marque as duas opções para confirmar sua entrada.</p> : null}
          </div>
        </div>
      )}

      {boostHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 py-8 backdrop-blur-[2px]" onMouseDown={() => setBoostHelpOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="boost-help-title" className="w-full max-w-lg rounded-[1.7rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.22)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Impulsionar Equipe</p>
                <h3 id="boost-help-title" className="mt-1 text-xl font-black text-zinc-950">Como funciona</h3>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setBoostHelpOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-black text-zinc-500 transition hover:bg-pink-50 hover:text-pink-500">×</button>
            </div>
            <div className="mt-5 rounded-[1.5rem] bg-zinc-950 p-5 text-sm leading-6 text-white/75">
              <p><strong className="text-white">1.</strong> Escolha um plano de impulsionamento.</p>
              <p className="mt-3"><strong className="text-white">2.</strong> O valor é reservado do seu saldo e você entra em uma fila única.</p>
              <p className="mt-3"><strong className="text-white">3.</strong> Quando houver capacidade, o impulso é ativado.</p>
              <p className="mt-3"><strong className="text-white">4.</strong> Cada nova entrada confirmada consome uma conexão.</p>
              <p className="mt-3"><strong className="text-white">5.</strong> Ao terminar as conexões, o impulso é concluído automaticamente.</p>
            </div>
            <div className="mt-5 space-y-3 text-sm leading-6 text-zinc-600">
              <p><strong className="text-zinc-900">Enquanto estiver na fila:</strong> você pode sair e receber o saldo reservado de volta.</p>
              <p><strong className="text-zinc-900">Depois que o impulso é ativado:</strong> não há cancelamento nem reembolso.</p>
              <p>As novas afiliadas são distribuídas entre os impulsos ativos conforme a capacidade do sistema.</p>
            </div>
            <button type="button" onClick={() => setBoostHelpOpen(false)} className="mt-6 w-full rounded-xl bg-zinc-950 py-3 font-black text-white transition hover:bg-pink-500">Entendi</button>
          </div>
        </div>
      )}

      {fixedHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-5 py-8 backdrop-blur-[2px]" onMouseDown={() => setFixedHelpOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="fixed-help-title" className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-[0_30px_100px_rgba(0,0,0,.22)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Bônus Fixo</p><h3 id="fixed-help-title" className="mt-1 text-xl font-black text-zinc-950">Metas acumuladas</h3></div>
              <button type="button" aria-label="Fechar" onClick={() => setFixedHelpOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-black text-zinc-500">×</button>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-6 text-zinc-600">
              <p>O Bônus Fixo considera todas as suas vendas acumuladas. Ao atingir a meta de Bronze, Prata ou Ouro, esse nível fica permanente.</p>
              <p>Hoje as metas são <strong>{config.fixedLevels?.bronze || 100}</strong> vendas para Bronze, <strong>{config.fixedLevels?.silver || 300}</strong> para Prata e <strong>{config.fixedLevels?.gold || 500}</strong> para Ouro.</p>
              <p>O nível fixo funciona como um piso do Bônus Mensal: mesmo que um novo mês comece com poucas vendas, você mantém o nível fixo que já conquistou até alcançar o próximo.</p>
            </div>
            <button type="button" onClick={() => setFixedHelpOpen(false)} className="mt-6 w-full rounded-xl bg-zinc-950 py-3 font-black text-white transition hover:bg-pink-500">Entendi</button>
          </div>
        </div>
      )}

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
              <p>Os pontos do mês são a soma das suas vendas com as vendas das afiliadas diretamente na sua equipe. O progresso reinicia no dia 1 de cada mês, à 00:00, mas nunca fica abaixo do seu Bônus Fixo.</p>
              <p>Os níveis atingidos são retroativos às vendas do mês: ao alcançar um novo nível, todas as vendas daquele mês passam a receber o valor por pedido daquele nível.</p>
              <p>Ao entrar em uma equipe, o bônus de Bronze dura exatamente 30 dias corridos a partir da data e hora do cadastro na equipe. Ele não termina na virada do mês. Quando os 30 dias acabam, o bônus é retirado e o nível volta imediatamente ao progresso real do mês, respeitando o Bônus Fixo já conquistado.</p>
            </div>
            <button type="button" onClick={() => setLevelHelpOpen(false)} className="mt-6 w-full rounded-xl bg-zinc-950 py-3 font-black text-white transition hover:bg-pink-500">Entendi</button>
          </div>
        </div>
      )}
    </main>
  )
}

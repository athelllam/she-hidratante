import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

function brl(value) {
  return `R$ ${Number(value || 0).toFixed(2).replace('.', ',')}`
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

export default function AffiliateDashboard() {
  const [affiliate, setAffiliate] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [registerMode, setRegisterMode] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', email: '', password: '' })
  const [login, setLogin] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')

  const load = async ({ sync = false } = {}) => {
    try {
      const data = await api('/api/affiliate/dashboard')
      setAffiliate(data.affiliate)
      setDashboard(data)
      setLoading(false)

      if (sync) {
        setSyncing(true)
        setSyncMessage('Atualizando vendas da Yampi…')
        try {
          const result = await api('/api/affiliate/yampi-sync', { method: 'POST', body: '{}' })
          if (result.configured === false) {
            setSyncMessage('Yampi ainda não configurada no Vercel.')
          } else {
            setSyncMessage(`${result.synced || 0} pedido(s) da Yampi sincronizado(s).`)
            const refreshed = await api('/api/affiliate/dashboard')
            setDashboard(refreshed)
          }
        } catch (e) {
          setSyncMessage(e.message || 'Não foi possível atualizar a Yampi.')
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

  const cards = useMemo(() => {
    const m = dashboard?.metrics || {}
    return [
      ['Acessos', m.accesses || 0],
      ['Vendas', m.sales || 0],
      ['Faturamento', brl(m.revenue)],
      ['Ticket médio', brl(m.averageTicket)],
      ['Saldo / comissão', brl(m.commission)],
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

  return (
    <main className="min-h-screen bg-[#fffafc] px-5 py-8 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-pink-500">She Afiliadas</p>
            <h1 className="mt-1 text-3xl md:text-4xl font-black text-zinc-950">Olá, {affiliate.name}.</h1>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {syncMessage && <span className="text-xs font-semibold text-zinc-400">{syncMessage}</span>}
            <button
              onClick={() => load({ sync: true })}
              disabled={syncing}
              className="rounded-xl bg-pink-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              {syncing ? 'Atualizando…' : 'Atualizar Yampi'}
            </button>
            <Link to={`/${affiliate.slug}`} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-zinc-800 shadow-sm border border-zinc-200">Ver página</Link>
            <button onClick={logout} className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-bold text-white">Sair</button>
          </div>
        </header>

        <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] bg-white p-5 border border-pink-100 shadow-sm">
              <p className="text-xs uppercase tracking-[.18em] text-zinc-400">{label}</p>
              <p className="mt-3 text-2xl font-black text-zinc-950">{value}</p>
            </div>
          ))}
        </section>


        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="rounded-[1.5rem] bg-white p-6 border border-pink-100">
            <h2 className="font-black text-xl">Desempenho</h2>
            {chart.length ? (
              <div className="mt-8 h-52 flex items-end gap-2">
                {chart.map((item) => (
                  <div key={item.date} title={`${item.date}: ${brl(item.revenue)}`} className="flex-1 rounded-t-xl bg-pink-300 min-w-1" style={{height:`${Math.max(5,(Number(item.revenue||0)/maxRevenue)*100)}%`}} />
                ))}
              </div>
            ) : (
              <div className="mt-8 h-52 grid place-items-center rounded-2xl bg-zinc-50 text-sm text-zinc-400">Ainda não há vendas registradas.</div>
            )}
          </div>

          <div className="rounded-[1.5rem] bg-white p-6 border border-pink-100">
            <h2 className="font-black text-xl">Seu link</h2>
            <p className="mt-2 text-sm text-zinc-500">Compartilhe sua página exclusiva.</p>
            <div className="mt-5 rounded-xl bg-zinc-50 p-4 text-sm font-semibold break-all">{publicUrl}</div>
            <button onClick={() => navigator.clipboard?.writeText(publicUrl)} className="mt-3 w-full rounded-xl bg-pink-500 py-3 font-bold text-white">Copiar link</button>
            <img src={qrUrl} alt="QR Code da afiliada" className="mx-auto mt-5 h-44 w-44 rounded-xl border border-zinc-100 p-2" />
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-white p-6 border border-pink-100 overflow-x-auto">
          <h2 className="font-black text-xl">Pedidos atribuídos</h2>
          <table className="mt-5 w-full min-w-[700px] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-zinc-400"><th className="pb-3">Pedido</th><th className="pb-3">Status</th><th className="pb-3">Valor</th><th className="pb-3">Comissão</th><th className="pb-3">Data</th></tr></thead>
            <tbody>
              {(dashboard?.orders || []).map(order => (
                <tr key={order.yampi_order_id} className="border-t border-zinc-100">
                  <td className="py-3 font-semibold">{order.yampi_order_id}</td>
                  <td className="py-3">{order.status}</td>
                  <td className="py-3">{brl(order.total)}</td>
                  <td className="py-3">{brl(order.commission)}</td>
                  <td className="py-3">{new Date(order.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}

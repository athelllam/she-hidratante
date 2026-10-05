import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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

export default function AffiliatePasswordReset() {
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const hasToken = useMemo(() => Boolean(accessToken), [accessToken])

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const query = new URLSearchParams(window.location.search)
    const pathParts = window.location.pathname.split('/').filter(Boolean)
    const pathToken = pathParts[0] === 'afiliado' && pathParts[1] === 'redefinir-senha' ? (pathParts[2] || '') : ''
    const storedToken = window.sessionStorage.getItem('shePasswordResetToken') || ''
    const token = pathToken || hash.get('access_token') || query.get('access_token') || query.get('token') || storedToken
    setAccessToken(token)
    if (token) window.sessionStorage.setItem('shePasswordResetToken', token)
    if (window.history.replaceState && token && pathToken) {
      window.history.replaceState({}, document.title, '/afiliado/redefinir-senha')
    }
    const type = hash.get('type') || query.get('type') || ''
    if (type && type !== 'recovery') setError('Link de redefinição inválido.')
    if (!token) setError('Este link de redefinição é inválido ou expirou. Solicite um novo link.')
  }, [])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!hasToken) return setError('Este link de redefinição é inválido ou expirou.')
    if (password.length < 8) return setError('A nova senha precisa ter pelo menos 8 caracteres.')
    if (password !== confirmPassword) return setError('As senhas não coincidem.')

    setBusy(true)
    try {
      await api('/api/affiliate/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: accessToken, password }),
      })
      window.sessionStorage.removeItem('shePasswordResetToken')
      setMessage('Senha alterada com sucesso. Você já pode entrar na sua conta.')
      setTimeout(() => navigate('/afiliado', { replace: true }), 900)
    } catch (e) {
      setError(e.message || 'Não foi possível alterar sua senha.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#fffafc] px-5 py-16 flex items-center justify-center">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-[0_30px_100px_rgba(0,0,0,.10)] border border-pink-100">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[.28em] text-pink-500 uppercase">She</p>
          <h1 className="mt-2 text-3xl font-black text-zinc-950">Nova senha</h1>
          <p className="mt-2 text-sm text-zinc-500">Crie uma nova senha para sua área de afiliada.</p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-3">
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" minLength={8} required placeholder="Nova senha (mín. 8 caracteres)" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" disabled={!hasToken} />
          <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" minLength={8} required placeholder="Repita a nova senha" className="w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-pink-400" disabled={!hasToken} />
          {error && <p className="text-xs leading-5 text-red-500">{error}</p>}
          {message && <p className="text-xs leading-5 text-emerald-600">{message}</p>}
          <button disabled={busy || !hasToken} className="w-full rounded-2xl bg-pink-500 py-3.5 font-bold text-white disabled:opacity-60">{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>

        <Link to="/afiliado" className="mt-5 block text-center text-xs font-semibold text-zinc-400 hover:text-zinc-600">Voltar para o login</Link>
      </div>
    </div>
  )
}

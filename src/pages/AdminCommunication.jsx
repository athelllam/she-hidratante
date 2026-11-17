import { useEffect, useState } from 'react'

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || `Erro ${response.status}`)
  return data
}

export default function AdminCommunication() {
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [yampiBusy, setYampiBusy] = useState(false)
  const [yampiPage, setYampiPage] = useState(1)
  const [yampiHasMore, setYampiHasMore] = useState(true)
  const [file, setFile] = useState(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])
  const PAGE_SIZE = 100

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await request('/api/admin/affiliates?__handler=communication')
      setContacts(data.contacts || []); setAuthorized(true)
    } catch (e) {
      if (e.message.includes('401') || e.message.toLowerCase().includes('autentic')) setAuthorized(false)
      else setError(e.message)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  async function importFile() {
    if (!file) return
    setBusy(true); setMessage(''); setError('')
    try {
      const raw = JSON.parse(await file.text())
      const submissions = Array.isArray(raw) ? raw : raw.submissions
      if (!Array.isArray(submissions)) throw new Error('O JSON não contém uma lista "submissions".')
      const result = await request('/api/admin/affiliates?__handler=communication', { method: 'POST', body: JSON.stringify({ submissions }) })
      setMessage(`Importação concluída: ${result.inserted} novos, ${result.updated} atualizados e ${result.duplicates} duplicados ignorados.`)
      setFile(null); await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }


  async function syncYampi() {
    setYampiBusy(true); setMessage(''); setError('')
    try {
      const result = await request('/api/business-analytics?view=sync-yampi-contacts', { method: 'POST', body: JSON.stringify({ page: yampiPage }) })
      setYampiPage(result.next_page || 1)
      setYampiHasMore(Boolean(result.has_more))
      setMessage(`Yampi — página ${result.page}: ${result.orders_read} pedidos lidos, ${result.contacts_processed} contatos processados, ${result.skipped} sem dados de contato${result.failed ? ` e ${result.failed} falhas` : ''}. ${result.message} Os contatos são mesclados sem duplicidade e respeitando descadastros.`)
      await load()
    } catch (e) { setError(e.message) } finally { setYampiBusy(false) }
  }

  const filtered = contacts.filter(c => {
    const origins = String(c.source || 'unknown').toLowerCase().split(',').map(value => value.trim())
    const matchesSource = sourceFilter === 'all' || origins.includes(sourceFilter)
    const matchesSearch = `${c.name || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase().includes(search.toLowerCase())
    return matchesSource && matchesSearch
  })
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleContacts = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const visibleIds = visibleContacts.map(c => c.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id))
  function toggleVisibleSelection() {
    setSelectedIds(current => allVisibleSelected ? current.filter(id => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])])
  }
  function toggleContact(id) { setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]) }
  if (loading) return <main className="min-h-screen bg-[#fffafc] p-8 text-sm text-zinc-500">Carregando Painel de Comunicação…</main>
  if (!authorized) return <main className="min-h-screen bg-[#fffafc] px-5 py-16"><div className="mx-auto max-w-lg rounded-3xl border border-pink-100 bg-white p-8 text-center shadow-sm"><h1 className="text-2xl font-black text-zinc-900">Acesso restrito</h1><p className="mt-3 text-sm text-zinc-600">Entre no Painel Admin com sua sessão de administrador para acessar os contatos e campanhas.</p><a href="/admin" className="mt-5 inline-flex rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white">Ir para o Painel Admin</a></div></main>
  return <main className="min-h-screen bg-[#fffafc] px-5 py-8 md:px-10"><div className="mx-auto max-w-7xl">
    <a href="/admin" className="text-sm font-bold text-pink-600">← Voltar ao Painel Admin</a>
    <header className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-pink-500">SHE · Administração</p><h1 className="mt-1 text-3xl font-black text-zinc-950">Painel de Comunicação</h1><p className="mt-2 text-sm text-zinc-600">Base unificada de contatos para futuras comunicações por e-mail e SMS.</p></div><div className="rounded-2xl bg-white px-5 py-3 shadow-sm"><div className="text-xs font-bold text-zinc-500">Contatos cadastrados</div><div className="text-2xl font-black text-zinc-900">{contacts.length}</div></div></header>
    <section className="mt-7 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><h2 className="font-black text-zinc-900">Sincronizar clientes da Yampi</h2><p className="mt-1 text-sm text-zinc-600">Busca somente os dados de clientes dos pedidos Yampi, em páginas de até 100. Não executa nem altera a sincronização financeira. Clique novamente para avançar até concluir o histórico.</p><div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={syncYampi} disabled={yampiBusy || busy} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{yampiBusy ? 'Importando clientes…' : `Importar clientes Yampi (página ${yampiPage})`}</button><span className="text-xs text-zinc-500">Importação independente da rotina financeira; não altera pedidos financeiros, atribuição de afiliadas nem comissões. {yampiHasMore ? 'Há páginas para importar.' : 'Última importação concluída; clique novamente para reiniciar a partir da página 1.'}</span></div></section>
    <section className="mt-5 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><h2 className="font-black text-zinc-900">Importar base Formspree</h2><p className="mt-1 text-sm text-zinc-600">Selecione o arquivo JSON exportado do Formspree. A importação identifica contatos pelo e-mail ou telefone e evita duplicidades.</p><div className="mt-4 flex flex-wrap items-center gap-3"><input type="file" accept=".json,application/json" onChange={e => setFile(e.target.files?.[0] || null)} className="max-w-full text-sm"/><button onClick={importFile} disabled={!file || busy} className="rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{busy ? 'Importando…' : 'Importar contatos'}</button></div>
      <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">Autorização de marketing confirmada pelo administrador para os contatos importados, por e-mail e SMS. O registro é separado por canal e respeita descadastros já registrados. Esta tela ainda não dispara campanhas.</p>
      {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}{error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    </section>
    <section className="mt-6 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black text-zinc-900">Contatos</h2><div className="flex w-full flex-wrap gap-2 sm:w-auto"><select aria-label="Filtrar contatos por origem" value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 outline-none focus:border-pink-300"><option value="all">Todas as origens</option><option value="formspree">Somente Formspree</option><option value="yampi">Somente Yampi</option></select><input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar nome, e-mail ou telefone" className="w-full max-w-sm rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-pink-300"/></div></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-700"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} className="h-4 w-4 accent-pink-500"/> Selecionar todos desta página ({visibleContacts.length})</label>
        <span className="text-xs text-zinc-500">{selectedIds.length} contato(s) selecionado(s) · exibindo até 100 por página</span>
      </div>
      <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b border-zinc-100 text-xs uppercase text-zinc-500"><tr><th className="py-3 pr-3">Selecionar</th><th className="py-3">Nome</th><th>E-mail</th><th>Telefone</th><th>Origem</th><th>Marketing por canal</th></tr></thead><tbody>{visibleContacts.map(c => <tr key={c.id} className="border-b border-zinc-50"><td className="py-3 pr-3"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleContact(c.id)} aria-label={`Selecionar ${c.name || c.email || 'contato'}`} className="h-4 w-4 accent-pink-500"/></td><td className="py-3 font-semibold text-zinc-800">{c.name || '—'}</td><td>{c.email || '—'}</td><td>{c.phone || '—'}</td><td><div className="flex flex-wrap gap-1">{String(c.source || 'unknown').toLowerCase().split(',').map(origin => origin.trim()).filter(Boolean).map(origin => <span key={origin} className={`rounded-full px-2 py-1 text-xs font-bold ${origin === 'formspree' ? 'bg-violet-50 text-violet-800' : origin === 'yampi' ? 'bg-sky-50 text-sky-800' : 'bg-zinc-100 text-zinc-600'}`}>{origin === 'formspree' ? 'Formspree' : origin === 'yampi' ? 'Yampi' : origin}</span>)}</div></td><td className="space-x-1"><span className={`rounded-full px-2 py-1 text-xs font-bold ${c.email_marketing_consent ? 'bg-emerald-50 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>E-mail: {c.email_marketing_consent ? 'Ativo' : 'Inativo'}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${c.sms_marketing_consent ? 'bg-emerald-50 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>SMS: {c.sms_marketing_consent ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table>{!filtered.length && <p className="py-8 text-center text-sm text-zinc-500">Nenhum contato encontrado para os filtros selecionados.</p>}</div>
      {pageCount > 1 && <nav aria-label="Paginação de contatos" className="mt-5 flex flex-wrap items-center gap-2">{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button key={number} onClick={() => setPage(number)} className={`min-w-10 rounded-lg px-3 py-2 text-sm font-bold ${page === number ? 'bg-pink-500 text-white' : 'border border-pink-100 bg-white text-zinc-700 hover:bg-pink-50'}`}>{number}</button>)}</nav>}
    </section>
  </div></main>
}

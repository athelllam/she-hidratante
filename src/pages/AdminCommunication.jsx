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
  const [yampiProgress, setYampiProgress] = useState('')
  const [file, setFile] = useState(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [history, setHistory] = useState([])
  const [channel, setChannel] = useState('email')
  const [campaignTitle, setCampaignTitle] = useState('')
  const [campaignSubject, setCampaignSubject] = useState('')
  const [campaignContent, setCampaignContent] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [campaignBusy, setCampaignBusy] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [manualBusy, setManualBusy] = useState(false)
  const PAGE_SIZE = 100

  async function load() {
    setLoading(true); setError('')
    try {
      const data = await request('/api/admin/communication')
      setContacts(data.contacts || []); setAuthorized(true)
      const [campaignData, historyData] = await Promise.all([request('/api/admin/communication?action=campaigns'), request('/api/admin/communication?action=history')])
      setCampaigns(campaignData.campaigns || []); setHistory(historyData.history || [])
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
      const result = await request('/api/admin/communication', { method: 'POST', body: JSON.stringify({ submissions }) })
      setMessage(`Importação concluída: ${result.inserted} novos, ${result.updated} atualizados e ${result.duplicates} duplicados ignorados.`)
      setFile(null); await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }


  async function syncYampi() {
    setYampiBusy(true); setMessage(''); setError(''); setYampiProgress('Iniciando importação…')
    let pageToRead = 1
    let pagesRead = 0
    let ordersRead = 0
    let contactsProcessed = 0
    let skipped = 0
    let failed = 0
    try {
      // Cada página é uma chamada independente para evitar timeout da Serverless Function.
      // Um único clique percorre o histórico inteiro em sequência.
      while (pageToRead && pagesRead < 1000) {
        setYampiProgress(`Importando página ${pageToRead}…`)
        const result = await request('/api/business-analytics?view=sync-yampi-contacts', { method: 'POST', body: JSON.stringify({ page: pageToRead }) })
        pagesRead += 1
        ordersRead += Number(result.orders_read || 0)
        contactsProcessed += Number(result.contacts_processed || 0)
        skipped += Number(result.skipped || 0)
        failed += Number(result.failed || 0)
        pageToRead = result.has_more ? Number(result.next_page || (Number(result.page || pageToRead) + 1)) : 0
      }
      if (pagesRead >= 1000 && pageToRead) throw new Error('A importação atingiu o limite de segurança de 1.000 páginas. Execute novamente para continuar.')
      setYampiProgress('')
      setMessage(`Importação Yampi concluída: ${pagesRead} páginas, ${ordersRead} pedidos verificados e ${contactsProcessed} contatos processados${skipped ? `; ${skipped} sem dados de contato` : ''}${failed ? `; ${failed} falhas` : ''}. Contatos existentes foram atualizados/mesclados sem duplicação.`)
      await load()
    } catch (e) { setYampiProgress(''); setError(e.message) } finally { setYampiBusy(false) }
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
    <section className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="font-black text-zinc-900">Yampi</h2><span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">Sincronização</span></div><p className="mt-1 text-xs leading-relaxed text-zinc-600">Percorre automaticamente todas as páginas de pedidos e importa apenas contatos novos ou atualiza os existentes.</p><div className="mt-3 flex flex-wrap items-center gap-2"><button onClick={syncYampi} disabled={yampiBusy || busy} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{yampiBusy ? 'Importando…' : 'Sincronizar Yampi'}</button>{yampiProgress && <span className="text-xs font-semibold text-sky-700">{yampiProgress}</span>}</div></div>
      <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="font-black text-zinc-900">Formspree</h2><span className="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">JSON</span></div><p className="mt-1 text-xs leading-relaxed text-zinc-600">Importe o arquivo exportado e mescle contatos sem duplicidade.</p><div className="mt-3 flex flex-wrap items-center gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-black text-violet-800 hover:bg-violet-100"><span>＋ Adicionar arquivo JSON</span><input type="file" accept=".json,application/json" onChange={e => setFile(e.target.files?.[0] || null)} className="sr-only" /></label><button onClick={importFile} disabled={!file || busy} className="rounded-lg bg-pink-500 px-3 py-2 text-xs font-black text-white disabled:opacity-50">{busy ? 'Importando…' : 'Importar'}</button>{file && <span className="max-w-[130px] truncate text-[11px] text-zinc-500">{file.name}</span>}</div></div>
      <div className="rounded-2xl border border-pink-100 bg-white p-3 shadow-sm"><div className="flex items-center justify-between gap-2"><h2 className="font-black text-zinc-900">Cadastro manual</h2><span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Novo contato</span></div><p className="mt-1 text-xs leading-relaxed text-zinc-600">Cadastre um cliente individualmente, verificando antes se já existe por nome, e-mail ou telefone.</p><button onClick={() => setManualOpen(v => !v)} className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">＋ Adicionar manualmente</button></div>
    </section>
    {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}{error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
    {manualOpen && <section className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black text-zinc-900">Cadastrar cliente manualmente</h2><p className="mt-1 text-xs text-zinc-500">Preencha os dados e clique em cadastrar. A base será verificada automaticamente.</p></div><button onClick={() => setManualOpen(false)} className="text-sm font-bold text-zinc-500">Fechar ×</button></div><div className="mt-3 grid gap-3 md:grid-cols-3"><input value={manualName} onChange={e => setManualName(e.target.value)} placeholder="Nome completo *" className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"/><input value={manualEmail} onChange={e => setManualEmail(e.target.value)} placeholder="E-mail" type="email" className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"/><input value={manualPhone} onChange={e => setManualPhone(e.target.value)} placeholder="Telefone / WhatsApp" className="rounded-xl border border-zinc-200 px-3 py-2.5 text-sm"/></div><div className="mt-3"><button disabled={manualBusy || !manualName.trim() || (!manualEmail.trim() && !manualPhone.trim())} onClick={async () => { setManualBusy(true); setError(''); setMessage(''); try { const r = await request('/api/admin/communication', { method: 'POST', body: JSON.stringify({ action: 'create_manual_contact', name: manualName, email: manualEmail, phone: manualPhone }) }); setMessage(r.message || 'Cliente cadastrado com sucesso.'); setManualName(''); setManualEmail(''); setManualPhone(''); await load(); } catch(e) { setError(e.message) } finally { setManualBusy(false) } }} className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40">{manualBusy ? 'Cadastrando…' : 'Cadastrar cliente'}</button></div></section>}
    <section className="mt-6 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black text-zinc-900">Comunicados</h2><p className="mt-1 text-xs text-zinc-500">Crie e salve campanhas separadas para e-mail e SMS.</p></div><div className="flex gap-2"><button onClick={() => { setChannel('email'); setCampaignId(''); setCampaignTitle(''); setCampaignSubject(''); setCampaignContent(''); setEditorOpen(true) }} className="rounded-xl bg-pink-600 px-4 py-2.5 text-sm font-black text-white">＋ Criar Comunicado por E-mail</button><button onClick={() => { setChannel('sms'); setCampaignId(''); setCampaignTitle(''); setCampaignSubject(''); setCampaignContent(''); setEditorOpen(true) }} className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-black text-white">＋ Criar Comunicado por SMS</button></div></div>
      {editorOpen && <div className="mt-5 rounded-2xl border border-pink-100 bg-[#fffafd] p-4"><div className="flex items-center justify-between"><h3 className="font-black">{channel === 'email' ? 'Editor de e-mail' : 'Editor de SMS'}</h3><button onClick={() => setEditorOpen(false)} className="text-sm font-bold text-zinc-500">Fechar ×</button></div><div className="mt-3 grid gap-3"><input value={campaignTitle} onChange={e => setCampaignTitle(e.target.value)} placeholder="Nome interno do comunicado" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"/>{channel === 'email' && <input value={campaignSubject} onChange={e => setCampaignSubject(e.target.value)} placeholder="Assunto do e-mail" className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm"/>}{channel === 'email' && <div className="rounded-xl border border-pink-100 bg-white p-3"><label className="text-xs font-bold text-zinc-700">Importar HTML criado pelo ChatGPT</label><input type="file" accept=".html,.htm,text/html" className="mt-2 block text-sm" onChange={async e => { const f = e.target.files?.[0]; if (f) setCampaignContent(await f.text()) }}/><p className="mt-1 text-xs text-zinc-500">Você pode importar um arquivo HTML completo com textos, imagens e estilos. Imagens devem estar hospedadas em URLs públicas ou incorporadas no HTML.</p></div>}<textarea value={campaignContent} onChange={e => setCampaignContent(e.target.value)} rows={channel === 'email' ? 12 : 5} placeholder={channel === 'email' ? 'Cole aqui o HTML completo do e-mail ou escreva o conteúdo…' : 'Digite o texto da mensagem SMS…'} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 font-mono text-sm"/><div className="flex flex-wrap gap-2"><button disabled={campaignBusy} onClick={async () => { setCampaignBusy(true); setError(''); try { const r = await request('/api/admin/communication', { method: 'POST', body: JSON.stringify({ action: 'save_campaign', id: campaignId || undefined, channel, title: campaignTitle, subject: campaignSubject, content: campaignContent }) }); setCampaignId(String(r.campaign.id)); const d = await request('/api/admin/communication?action=campaigns'); setCampaigns(d.campaigns || []); setMessage('Comunicado salvo. Selecione os contatos na lista e envie quando estiver pronto.'); } catch(e) { setError(e.message) } finally { setCampaignBusy(false) } }} className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-black text-white">{campaignBusy ? 'Salvando…' : 'Salvar comunicado'}</button><span className="self-center text-xs text-zinc-500">Salve antes de enviar. O envio usa somente contatos com consentimento ativo no canal.</span></div></div></div>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">{campaigns.map(c => <div key={c.id} className="rounded-xl border border-zinc-100 p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase text-zinc-500">{c.channel === 'email' ? 'E-mail' : 'SMS'}</span><span className="text-xs text-zinc-400">{new Date(c.updated_at).toLocaleString('pt-BR')}</span></div><p className="mt-1 font-bold text-zinc-900">{c.title}</p>{c.subject && <p className="text-xs text-zinc-500">Assunto: {c.subject}</p>}<div className="mt-3 flex gap-2"><button onClick={() => { setChannel(c.channel); setCampaignId(String(c.id)); setCampaignTitle(c.title); setCampaignSubject(c.subject || ''); setCampaignContent(c.content); setEditorOpen(true) }} className="rounded-lg border px-3 py-2 text-xs font-bold">Editar</button><button disabled={!selectedIds.length || campaignBusy} onClick={async () => { if (!window.confirm(`Enviar ${c.channel === 'email' ? 'e-mail' : 'SMS'} para ${selectedIds.length} contato(s) selecionado(s)?`)) return; setCampaignBusy(true); setError(''); try { const r = await request('/api/admin/communication', { method: 'POST', body: JSON.stringify({ action: 'send_campaign', campaign_id: c.id, channel: c.channel, contact_ids: selectedIds }) }); setMessage(`Envio concluído: ${r.sent} enviados; ${r.skipped} ignorados por falta de consentimento ou dados.`); setSelectedIds([]); const h = await request('/api/admin/communication?action=history'); setHistory(h.history || []); } catch(e) { setError(e.message) } finally { setCampaignBusy(false) } }} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Enviar para selecionados</button></div></div>)}</div>
    </section>
    <section className="mt-6 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-black text-zinc-900">Contatos</h2><div className="flex w-full flex-wrap gap-2 sm:w-auto"><select aria-label="Filtrar contatos por origem" value={sourceFilter} onChange={e => { setSourceFilter(e.target.value); setPage(1) }} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 outline-none focus:border-pink-300"><option value="all">Todas as origens</option><option value="formspree">Somente Formspree</option><option value="yampi">Somente Yampi</option><option value="manual">Somente cadastro manual</option></select><input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar nome, e-mail ou telefone" className="w-full max-w-sm rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-pink-300"/></div></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-700"><input type="checkbox" checked={allVisibleSelected} onChange={toggleVisibleSelection} className="h-4 w-4 accent-pink-500"/> Selecionar todos desta página ({visibleContacts.length})</label>
        <span className="text-xs text-zinc-500">{selectedIds.length} contato(s) selecionado(s) · lista com rolagem (10 contatos visíveis)</span>
      </div>
      <div className="mt-3 max-h-[640px] overflow-auto rounded-xl border border-zinc-100"><table className="w-full min-w-[800px] text-left text-sm"><thead className="sticky top-0 z-10 border-b border-zinc-100 bg-white text-xs uppercase text-zinc-500"><tr><th className="py-3 pr-3">Selecionar</th><th className="py-3">Nome</th><th>E-mail</th><th>Telefone</th><th>Origem</th><th>Marketing por canal</th></tr></thead><tbody>{visibleContacts.map(c => <tr key={c.id} className="border-b border-zinc-50"><td className="py-3 pr-3"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleContact(c.id)} aria-label={`Selecionar ${c.name || c.email || 'contato'}`} className="h-4 w-4 accent-pink-500"/></td><td className="py-3 font-semibold text-zinc-800">{c.name || '—'}</td><td>{c.email || '—'}</td><td>{c.phone || '—'}</td><td><div className="flex flex-wrap gap-1">{String(c.source || 'unknown').toLowerCase().split(',').map(origin => origin.trim()).filter(Boolean).map(origin => <span key={origin} className={`rounded-full px-2 py-1 text-xs font-bold ${origin === 'formspree' ? 'bg-violet-50 text-violet-800' : origin === 'yampi' ? 'bg-sky-50 text-sky-800' : 'bg-zinc-100 text-zinc-600'}`}>{origin === 'formspree' ? 'Formspree' : origin === 'yampi' ? 'Yampi' : origin}</span>)}</div></td><td className="space-x-1"><span className={`rounded-full px-2 py-1 text-xs font-bold ${c.email_marketing_consent ? 'bg-emerald-50 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>E-mail: {c.email_marketing_consent ? 'Ativo' : 'Inativo'}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${c.sms_marketing_consent ? 'bg-emerald-50 text-emerald-800' : 'bg-zinc-100 text-zinc-600'}`}>SMS: {c.sms_marketing_consent ? 'Ativo' : 'Inativo'}</span></td></tr>)}</tbody></table>{!filtered.length && <p className="py-8 text-center text-sm text-zinc-500">Nenhum contato encontrado para os filtros selecionados.</p>}</div>
      {pageCount > 1 && <nav aria-label="Paginação de contatos" className="mt-5 flex flex-wrap items-center gap-2">{Array.from({ length: pageCount }, (_, index) => index + 1).map(number => <button key={number} onClick={() => setPage(number)} className={`min-w-10 rounded-lg px-3 py-2 text-sm font-bold ${page === number ? 'bg-pink-500 text-white' : 'border border-pink-100 bg-white text-zinc-700 hover:bg-pink-50'}`}>{number}</button>)}</nav>}
    </section>
    <section className="mt-6 rounded-2xl border border-pink-100 bg-white p-5 shadow-sm"><h2 className="font-black text-zinc-900">Histórico de envios</h2><p className="mt-1 text-xs text-zinc-500">Registro dos comunicados enviados, incluindo data, canal e conteúdo.</p><div className="mt-3 space-y-3">{history.map(item => <details key={item.id} className="rounded-xl border border-zinc-100 p-3"><summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">{item.title} · {item.channel === 'email' ? 'E-mail' : 'SMS'}</span><span className="text-xs text-zinc-500">{new Date(item.sent_at).toLocaleString('pt-BR')} · {item.recipient_count} destinatários</span></summary>{item.subject && <p className="mt-2 text-sm"><b>Assunto:</b> {item.subject}</p>}<pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 p-3 text-xs">{item.content}</pre></details>)}{!history.length && <p className="py-5 text-center text-sm text-zinc-500">Nenhum envio registrado ainda.</p>}</div></section>
  </div></main>
}

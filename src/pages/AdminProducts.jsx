import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const blankProduct = { id: '', name: '', description: '', yampi_token: '', image_url: '', active: true }
const money = value => value == null ? 'Preço não localizado' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options })
  const data = await response.json().catch(() => ({}))
  if (response.status === 401) throw new Error('Sua sessão administrativa expirou. Entre novamente pelo painel Admin.')
  if (!response.ok || data.ok === false) throw new Error(data.error || `Erro HTTP ${response.status}`)
  return data
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [pages, setPages] = useState([])
  const [mappings, setMappings] = useState([])
  const [selectedPage, setSelectedPage] = useState('')
  const [editing, setEditing] = useState(blankProduct)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [pageModal, setPageModal] = useState(false)
  const [pageName, setPageName] = useState('')
  const [pageSlug, setPageSlug] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try {
      const data = await request('/api/admin/products')
      setProducts(data.products || []); setPages(data.pages || []); setMappings(data.mappings || [])
      setSelectedPage(current => current || data.pages?.[0]?.id || '')
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const currentPage = pages.find(page => String(page.id) === String(selectedPage))
  const pageMappings = useMemo(() => mappings.filter(row => String(row.page_id) === String(selectedPage)), [mappings, selectedPage])
  const roleFor = (productId, role) => pageMappings.some(row => String(row.product_id) === String(productId) && row.role === role && row.active !== false)

  const resetEditor = () => { setEditing(blankProduct); setImageFile(null); setImagePreview('') }
  const editProduct = product => { setEditing({ ...blankProduct, ...product }); setImageFile(null); setImagePreview(product.image_url || ''); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const fileToDataUrl = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file) })

  async function saveProduct(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      let image_data = null
      if (imageFile) image_data = await fileToDataUrl(imageFile)
      const data = await request('/api/admin/products', { method: 'POST', body: JSON.stringify({ ...editing, image_data, image_filename: imageFile?.name || editing.name }) })
      setNotice(data.priceWarning || `Produto ${data.product.name} salvo. ${data.price?.effectivePrice ? `Preço Yampi: ${money(data.price.effectivePrice)}.` : ''}`)
      resetEditor(); await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function saveCart() {
    if (!currentPage) return
    setBusy(true); setError(''); setNotice('')
    try {
      const rows = products.filter(product => product.active).flatMap(product => {
        const main = roleFor(product.id, 'main'); const upsell = roleFor(product.id, 'upsell')
        return [ ...(main ? [{ product_id: product.id, role: 'main' }] : []), ...(upsell ? [{ product_id: product.id, role: 'upsell' }] : []) ]
      })
      await request('/api/admin/products', { method: 'PUT', body: JSON.stringify({ page_id: currentPage.id, page_name: currentPage.name, page_slug: currentPage.slug, products: rows }) })
      setNotice(`Carrinho da página ${currentPage.name} salvo.`); await load()
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  function toggleRole(productId, role) {
    setMappings(current => {
      const exists = current.some(row => String(row.page_id) === String(selectedPage) && String(row.product_id) === String(productId) && row.role === role && row.active !== false)
      const without = current.filter(row => !(String(row.page_id) === String(selectedPage) && String(row.product_id) === String(productId) && row.role === role))
      return exists ? without : [...without, { page_id: selectedPage, product_id: productId, role, active: true, position: without.filter(row => String(row.page_id) === String(selectedPage) && row.role === role).length }]
    })
  }

  async function createPage(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const data = await request('/api/admin/products', { method: 'PUT', body: JSON.stringify({ page_name: pageName, page_slug: pageSlug, products: [] }) })
      setNotice(`Página ${data.page.name} registrada. Ela só terá carrinho funcional após ser conectada à página no código, conforme CART_INTEGRATION_GUIDE.md.`)
      setPageModal(false); setPageName(''); setPageSlug(''); await load(); setSelectedPage(data.page.id)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Excluir o produto ${product.name}?`)) return
    setBusy(true); setError('')
    try { await request(`/api/admin/products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE' }); setNotice('Produto excluído.'); await load() }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  return <main className="min-h-screen bg-[#fffafc] px-4 py-6 text-zinc-900 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-pink-100 bg-white p-5 shadow-sm">
        <div><p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">She · Administração</p><h1 className="mt-1 text-2xl font-black">Produtos e carrinhos</h1><p className="mt-1 text-sm text-zinc-500">Cadastre produtos e configure sua posição em cada carrinho.</p></div>
        <Link to="/admin" className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 no-underline hover:bg-zinc-50">← Voltar ao Admin</Link>
      </header>
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
      {notice && <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</div>}

      <section className="mb-7 rounded-3xl border border-pink-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">{editing.id ? 'Editar produto' : 'Cadastrar produto'}</h2><p className="text-sm text-zinc-500">O ID deve ser o token de checkout/SKU reconhecido pela integração atual da Yampi.</p></div>{editing.id && <button onClick={resetEditor} type="button" className="rounded-lg border px-3 py-2 text-xs font-bold">Cancelar edição</button>}</div>
        <form onSubmit={saveProduct} className="grid gap-4 md:grid-cols-[180px_1fr_1fr]">
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-3 text-center">
            {imagePreview ? <img src={imagePreview} alt="Prévia do produto" className="h-32 w-full object-contain" /> : <><span className="text-3xl">＋</span><span className="mt-2 text-sm font-black">Enviar imagem</span><span className="mt-1 text-xs text-zinc-500">Somente WebP · até 3 MB</span></>}
            <input className="sr-only" type="file" accept="image/webp,.webp" onChange={event => { const file = event.target.files?.[0]; if (!file) return; if (file.type !== 'image/webp' && !file.name.toLowerCase().endsWith('.webp')) { setError('Selecione um arquivo .webp.'); return } if (file.size > 3 * 1024 * 1024) { setError('A imagem deve ter até 3 MB.'); return } setImageFile(file); setImagePreview(URL.createObjectURL(file)); setError('') }} />
          </label>
          <div className="grid content-start gap-3"><label className="text-xs font-black text-zinc-600">Nome do produto<input required maxLength={120} value={editing.name} onChange={e => setEditing(v => ({ ...v, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm font-medium outline-none focus:border-pink-400" placeholder="Ex.: Sérum She" /></label><label className="text-xs font-black text-zinc-600">ID / token Yampi<input required minLength={5} maxLength={50} value={editing.yampi_token} onChange={e => setEditing(v => ({ ...v, yampi_token: e.target.value.toUpperCase().trim() }))} className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-3 font-mono text-sm font-medium outline-none focus:border-pink-400" placeholder="Ex.: EFH0YOIDTO" /></label><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editing.active !== false} onChange={e => setEditing(v => ({ ...v, active: e.target.checked }))} /> Produto ativo</label></div>
          <div className="grid content-start gap-3"><label className="text-xs font-black text-zinc-600">Descrição curta no carrinho<textarea maxLength={500} rows={4} value={editing.description} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))} className="mt-1 w-full resize-y rounded-xl border border-zinc-200 px-3 py-3 text-sm font-medium outline-none focus:border-pink-400" placeholder="Texto pequeno abaixo do nome" /></label><button disabled={busy} className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white hover:bg-pink-600 disabled:opacity-60">{busy ? 'Salvando…' : editing.id ? 'Salvar alterações' : 'Cadastrar produto e consultar Yampi'}</button></div>
        </form>
      </section>

      <section className="mb-7 rounded-3xl border border-pink-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Produtos cadastrados</h2><p className="text-sm text-zinc-500">Imagem, nome, descrição e token usado no checkout.</p></div><button type="button" onClick={load} className="rounded-xl border px-3 py-2 text-xs font-bold">Atualizar lista</button></div>
        {loading ? <p className="py-8 text-center text-sm text-zinc-500">Carregando produtos…</p> : products.length === 0 ? <p className="py-8 text-center text-sm text-zinc-500">Nenhum produto cadastrado.</p> : <div className="divide-y divide-zinc-100">{products.map(product => <div key={product.id} className="flex flex-wrap items-center gap-3 py-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-pink-50">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain" /> : <span className="text-2xl">📦</span>}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><b>{product.name}</b><span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${product.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{product.active ? 'Ativo' : 'Inativo'}</span></div><p className="mt-0.5 text-xs text-zinc-500">{product.description || 'Sem descrição'}</p><p className="mt-1 font-mono text-xs text-zinc-600">Yampi: {product.yampi_token}</p></div><div className="flex gap-2"><button onClick={() => editProduct(product)} className="rounded-lg border border-pink-200 px-3 py-2 text-xs font-black text-pink-700">Editar</button><button onClick={() => deleteProduct(product)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600">Excluir</button></div></div>)}</div>}
      </section>

      <section className="rounded-3xl border border-pink-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black">Configuração do carrinho por página</h2><p className="text-sm text-zinc-500">Um produto pode ser principal em uma página e upsell em outra.</p></div><button type="button" onClick={() => setPageModal(true)} className="rounded-xl border border-pink-200 px-3 py-2.5 text-xs font-black text-pink-700">＋ Registrar página</button></div>
        <label className="mb-5 block max-w-md text-xs font-black text-zinc-600">Página<select value={selectedPage} onChange={e => setSelectedPage(e.target.value)} className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold">{pages.map(page => <option key={page.id} value={page.id}>{page.name} (/{page.slug})</option>)}</select></label>
        {currentPage && <><div className="mb-4 rounded-xl bg-pink-50 p-3 text-sm text-pink-900"><b>{currentPage.name}</b> · <code>/{currentPage.slug}</code><p className="mt-1 text-xs text-pink-800">Marque uma ou ambas as opções. As posições determinam a ordem visual dentro de cada grupo.</p></div><div className="divide-y divide-zinc-100">{products.map(product => <div key={product.id} className="flex flex-wrap items-center gap-3 py-3"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-pink-50">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-contain" /> : '📦'}</div><div className="min-w-0 flex-1"><p className="text-sm font-black">{product.name}</p><p className="font-mono text-[10px] text-zinc-500">{product.yampi_token}</p></div><label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><input type="checkbox" disabled={!product.active} checked={roleFor(product.id, 'main')} onChange={() => toggleRole(product.id, 'main')} /> Principal</label><label className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold"><input type="checkbox" disabled={!product.active} checked={roleFor(product.id, 'upsell')} onChange={() => toggleRole(product.id, 'upsell')} /> Upsell</label></div>)}</div><button disabled={busy} onClick={saveCart} className="mt-5 w-full rounded-xl bg-pink-500 px-4 py-3.5 text-sm font-black text-white hover:bg-pink-600 disabled:opacity-60">{busy ? 'Salvando…' : `Salvar carrinho da página ${currentPage.name}`}</button></>}
      </section>
      {pageModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4"><form onSubmit={createPage} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 className="text-xl font-black">Registrar página de produto</h2><p className="mt-1 text-sm text-zinc-500">A página precisa ser conectada ao carrinho compartilhado no código. Consulte CART_INTEGRATION_GUIDE.md.</p><label className="mt-4 block text-xs font-black">Nome<input required value={pageName} onChange={e => { setPageName(e.target.value); if (!pageSlug) setPageSlug(e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) }} className="mt-1 w-full rounded-xl border px-3 py-3 text-sm" placeholder="Ex.: SkinClear" /></label><label className="mt-3 block text-xs font-black">Slug da rota<input required pattern="[a-z0-9-]+" value={pageSlug} onChange={e => setPageSlug(e.target.value.toLowerCase())} className="mt-1 w-full rounded-xl border px-3 py-3 text-sm" placeholder="skinclear" /></label><div className="mt-5 flex gap-2"><button type="button" onClick={() => setPageModal(false)} className="flex-1 rounded-xl border px-4 py-3 text-sm font-bold">Cancelar</button><button disabled={busy} className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white">Registrar</button></div></form></div>}
    </div>
  </main>
}

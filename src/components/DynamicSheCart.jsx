import { useEffect, useMemo, useState } from 'react'
import { buildYampiCheckoutUrl } from '../utils/affiliateTracking'

const brl = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function DynamicSheCart({ open, onClose, pageSlug, affiliateId = null, onPricesUpdated = null }) {
  const [config, setConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quantities, setQuantities] = useState({})
  const [selectedUpsells, setSelectedUpsells] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true); setError('')
    fetch(`/api/cart-config?slug=${encodeURIComponent(pageSlug)}`, { headers: { Accept: 'application/json' } })
      .then(async response => { const data = await response.json().catch(() => ({})); if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível carregar o carrinho.'); return data })
      .then(data => {
        if (!active) return
        setConfig(data)
        const mains = data.products.filter(product => product.role === 'main')
        setQuantities(current => Object.fromEntries(mains.map((product, index) => [product.id, current[product.id] ?? (index === 0 ? 1 : (pageSlug === 'hidratante' ? 1 : 0))])))
        setSelectedUpsells(current => Object.fromEntries(data.products.filter(product => product.role === 'upsell').map(product => [product.id, current[product.id] ?? false])))
        onPricesUpdated?.(Object.fromEntries(data.products.filter(product => product.price).map(product => [product.yampi_token, product.price])))
      })
      .catch(e => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, pageSlug])

  useEffect(() => {
    if (!open) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = event => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = old; window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  const mainItems = useMemo(() => config?.products?.filter(product => product.role === 'main') || [], [config])
  const upsellItems = useMemo(() => config?.products?.filter(product => product.role === 'upsell') || [], [config])
  const total = useMemo(() => {
    if (!config) return 0
    const mainTotal = mainItems.reduce((sum, product) => sum + Number(quantities[product.id] || 0) * Number(product.price?.effectivePrice || 0), 0)
    const upsellTotal = upsellItems.reduce((sum, product) => sum + (selectedUpsells[product.id] ? Number(product.price?.effectivePrice || 0) : 0), 0)
    return mainTotal + upsellTotal
  }, [config, mainItems, upsellItems, quantities, selectedUpsells])

  const selectedProducts = [...mainItems.filter(p => Number(quantities[p.id] || 0) > 0).map(p => `${p.yampi_token}:${Number(quantities[p.id])}`), ...upsellItems.filter(p => selectedUpsells[p.id]).map(p => `${p.yampi_token}:1`)]
  const selectedItemsHavePrice = [...mainItems.filter(p => Number(quantities[p.id] || 0) > 0), ...upsellItems.filter(p => selectedUpsells[p.id])].every(p => Number(p.price?.effectivePrice) > 0)
  const ready = !loading && config && selectedProducts.length > 0 && selectedItemsHavePrice && !error
  const checkout = () => {
    if (!ready || submitting) return
    setSubmitting(true)
    // Preserve the existing Yampi checkout URL format and affiliate metadata behavior.
    window.location.assign(buildYampiCheckoutUrl({ tokens: selectedProducts, affiliateId }))
  }

  if (!open) return null
  return <div className="fixed inset-0 z-[9999]">
    <button aria-label="Fechar carrinho" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
    <aside role="dialog" aria-modal="true" aria-label="Carrinho de compras" className="absolute right-0 top-0 flex h-full w-full max-w-[500px] flex-col overflow-y-auto bg-[#fffafc] shadow-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white/95 px-5 py-5 backdrop-blur"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-pink-500">She · Seu pedido</p><h2 className="text-xl font-black">Carrinho de compras</h2></div><button type="button" onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xl">×</button></header>
      <div className="flex-1 px-4 py-5 sm:px-5">
        {loading && <p className="rounded-xl bg-white p-5 text-sm text-zinc-500">Atualizando produtos e preços da Yampi…</p>}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><b>Não foi possível carregar o carrinho.</b><p className="mt-1">{error}</p><p className="mt-2 text-xs">Confira se a migração Supabase de produtos e carrinhos foi executada e se esta página está configurada no Admin.</p></div>}
        {config && !loading && !error && !mainItems.length && <p className="rounded-xl bg-white p-5 text-sm text-zinc-500">Nenhum produto principal configurado para esta página.</p>}
        {mainItems.length > 0 && <><h3 className="mb-3 text-xs font-black uppercase tracking-[.15em] text-zinc-500">Seu produto</h3><div className="space-y-3">{mainItems.map(product => {
          const qty = Number(quantities[product.id] || 0); const price = product.price
          return <article key={product.id} className="flex gap-3 rounded-[22px] border border-zinc-200 bg-white p-3.5 shadow-sm"><div className="flex h-[82px] w-[82px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff7fa]">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-1" /> : <span className="text-3xl">📦</span>}</div><div className="min-w-0 flex-1"><p className="text-sm font-black leading-tight text-zinc-950">{product.name}</p>{product.description && <p className="mt-1 text-[10px] leading-4 text-zinc-500">{product.description}</p>}<div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-sm font-black text-pink-600">{price?.effectivePrice ? brl(price.effectivePrice) : 'Preço indisponível'}</span>{price?.promotionalPrice && <span className="text-xs text-zinc-400 line-through">{brl(price.salePrice)}</span>}</div><div className="mt-2 inline-flex items-center gap-3 rounded-full bg-zinc-100 px-2 py-1"><button type="button" aria-label={`Diminuir ${product.name}`} onClick={() => setQuantities(v => ({ ...v, [product.id]: Math.max(pageSlug === 'hidratante' && product.yampi_token === 'EFH0YOIDTO' ? 1 : 0, qty - 1) }))} className="h-6 w-6 rounded-full bg-white font-black">−</button><span className="min-w-4 text-center text-xs font-black">{qty}</span><button type="button" aria-label={`Aumentar ${product.name}`} onClick={() => setQuantities(v => ({ ...v, [product.id]: qty + 1 }))} className="h-6 w-6 rounded-full bg-white font-black">+</button></div></div></article>
        })}</div></>}
        {upsellItems.length > 0 && <section className="mt-7"><div className="flex items-center gap-2"><span className="rounded-full bg-pink-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.16em] text-pink-600">Ofertas especiais</span><span className="h-px flex-1 bg-pink-100" /></div><h3 className="mt-2 text-xl font-black tracking-tight">Aproveite e adicione</h3><p className="mt-1 text-xs text-zinc-500">Condições especiais para o seu pedido.</p><div className="mt-3 space-y-3">{upsellItems.map(product => { const selected = Boolean(selectedUpsells[product.id]); const price = product.price; return <button type="button" key={product.id} onClick={() => setSelectedUpsells(v => ({ ...v, [product.id]: !v[product.id] }))} className={`flex w-full items-center gap-3 rounded-[22px] border p-3.5 text-left transition ${selected ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-white'}`}><div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#fff7fa]">{product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-contain p-1" /> : <span className="text-2xl">📦</span>}</div><div className="min-w-0 flex-1"><p className="text-sm font-black leading-tight">{product.name}</p>{product.description && <p className="mt-1 text-[10px] leading-4 text-zinc-500">{product.description}</p>}<p className="mt-2 text-sm font-black text-pink-600">{price?.effectivePrice ? brl(price.effectivePrice) : 'Preço indisponível'}</p></div><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-lg font-black ${selected ? 'border-pink-500 bg-pink-500 text-white' : 'border-zinc-300 bg-white text-zinc-300'}`}>{selected ? '✓' : '+'}</span></button> })}</div></section>}
      </div>
      <footer className="sticky bottom-0 border-t border-zinc-100 bg-white/95 px-5 py-4 backdrop-blur"><div className="mb-3 flex items-center justify-between"><span className="text-sm font-bold text-zinc-600">Subtotal</span><strong className="text-xl font-black text-zinc-950">{brl(total)}</strong></div>{total > 200 && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">🚚 Você ganhou frete grátis!</p>}<button type="button" disabled={!ready || submitting} onClick={checkout} className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-sm font-black text-white transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Indo para o checkout…' : loading ? 'Carregando preços…' : 'Finalizar compra'}</button><p className="mt-2 text-center text-[10px] text-zinc-400">Pagamento seguro processado pela Yampi.</p></footer>
    </aside>
  </div>
}

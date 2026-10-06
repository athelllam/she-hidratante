import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const WHATSAPP_NUMBER = '553132784332'

const PRODUCTS = [
  { key: 'hydrant', name: 'Hidratante Íntimo', short: 'Hidratante', description: 'Hidratação íntima premium para sua revenda.' },
  { key: 'hydrantBlister', name: 'Kit Hidratante + Blister', short: 'Kit Hidratante + Blister', description: 'Hidratante acompanhado do blister de ovinhos.' },
  { key: 'stick', name: 'Stick Clareador', short: 'Stick', description: 'Stick prático para tratamento de manchas.' },
  { key: 'complete', name: 'Kit Hidratante + Blister + Stick', short: 'Kit Completo', description: 'O combo completo da She para sua revenda.' },
]

const FALLBACK_PRICES = { hydrant: 0, hydrantBlister: 0, stick: 0, complete: 0 }

function brl(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function resellerDiscountPercent(quantity) {
  if (quantity < 5) return 0
  return Math.min(15, Math.floor(quantity / 5) * 5)
}

function discountedUnitPrice(price, quantity) {
  return price * (1 - resellerDiscountPercent(quantity) / 100)
}

function buildWhatsappMessage(items, total) {
  const lines = items.map(item => {
    const discount = resellerDiscountPercent(item.quantity)
    const unit = discountedUnitPrice(item.price, item.quantity)
    return `${item.quantity}x ${item.name} — ${brl(unit * item.quantity)} (${discount}% de desconto)`
  })
  return [
    'Oi She! Gostaria de adquirir esse pedido como revendedora.',
    '',
    'Meu pedido:',
    ...lines,
    '',
    `Total: ${brl(total)}`,
    '',
    'Aguardo as informações para pagamento e envio.',
  ].join('\n')
}

export default function Revendedora() {
  const [prices, setPrices] = useState(FALLBACK_PRICES)
  const [quantities, setQuantities] = useState({ hydrant: 0, hydrantBlister: 0, stick: 0, complete: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    fetch('/api/reseller/settings', { headers: { Accept: 'application/json' } })
      .then(async response => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.ok) throw new Error(data.error || 'Não foi possível carregar os preços.')
        return data
      })
      .then(data => setPrices({ ...FALLBACK_PRICES, ...data.prices }))
      .catch(err => setError(err.message || 'Não foi possível carregar os preços.'))
      .finally(() => setLoading(false))
  }, [])

  const items = useMemo(() => PRODUCTS.map(product => ({
    ...product,
    price: Number(prices[product.key] || 0),
    quantity: Number(quantities[product.key] || 0),
    discountPercent: resellerDiscountPercent(Number(quantities[product.key] || 0)),
    unitPrice: discountedUnitPrice(Number(prices[product.key] || 0), Number(quantities[product.key] || 0)),
  })).filter(item => item.quantity > 0), [prices, quantities])

  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const pricesReady = PRODUCTS.every(product => Number(prices[product.key]) > 0)

  const setQuantity = (key, next) => {
    const value = Number(next) || 0
    if (value <= 0) return setQuantities(current => ({ ...current, [key]: 0 }))
    const normalized = Math.max(5, Math.round(value / 5) * 5)
    setQuantities(current => ({ ...current, [key]: normalized }))
  }

  const checkout = () => {
    if (!items.length) return setCartOpen(true)
    const message = buildWhatsappMessage(items, total)
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <main className="min-h-screen bg-[#fff8fb] text-zinc-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-pink-200/30 blur-3xl" />
        <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-rose-200/25 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-white/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="text-sm font-black tracking-tight">SHE<span className="text-pink-500">.</span></Link>
          <button onClick={() => setCartOpen(true)} className="rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-black text-white shadow-lg shadow-zinc-900/10 transition hover:bg-pink-500">
            Carrinho {itemCount > 0 ? `· ${itemCount}` : ''}
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-10 pt-12 md:pb-14 md:pt-20">
        <div className="max-w-3xl">
          <p className="text-[11px] font-black uppercase tracking-[.28em] text-pink-500">Programa She</p>
          <h1 className="mt-3 text-4xl font-black leading-[.98] tracking-[-.04em] sm:text-5xl md:text-7xl">
            Revenda She.<br /><span className="text-pink-500">Ganhe mais.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-500 md:text-lg">
            Tenha acesso a condições especiais para revenda, monte seu pedido com os produtos que quiser e fale diretamente com a She pelo WhatsApp.
          </p>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ['Preços especiais', 'Condições exclusivas para revendedoras.'],
            ['Pedido sob medida', 'Escolha quantidades de cada produto.'],
            ['Atendimento direto', 'Finalize sua compra conversando com a She.'],
          ].map(([title, text]) => (
            <div key={title} className="rounded-3xl border border-white bg-white/80 p-5 shadow-[0_18px_60px_rgba(0,0,0,.06)] backdrop-blur">
              <p className="text-sm font-black">{title}</p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-3xl border border-pink-100 bg-gradient-to-r from-pink-50 to-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-zinc-950">Quanto mais você leva, maior o desconto.</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">Cada produto precisa ser pedido em múltiplos de 5. O desconto é calculado separadamente para cada kit.</p>
            </div>
            <div className="flex shrink-0 gap-2 text-[10px] font-black">
              <span className="rounded-full bg-white px-3 py-2 text-pink-500 shadow-sm">5 un. · 5%</span>
              <span className="rounded-full bg-white px-3 py-2 text-pink-500 shadow-sm">10 un. · 10%</span>
              <span className="rounded-full bg-zinc-950 px-3 py-2 text-white shadow-sm">15+ · 15%</span>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-32">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-zinc-400">Escolha seus produtos</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Monte seu pedido</h2>
          </div>
          <div className="hidden rounded-full bg-white px-4 py-2 text-xs font-black text-zinc-500 shadow-sm sm:block">{itemCount} {itemCount === 1 ? 'item' : 'itens'}</div>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
        {!loading && !pricesReady && <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">Os preços para revendedoras ainda não foram configurados no painel administrativo.</div>}

        <div className="grid gap-4 md:grid-cols-2">
          {PRODUCTS.map((product, index) => {
            const price = Number(prices[product.key] || 0)
            const quantity = quantities[product.key]
            return (
              <article key={product.key} className="group relative overflow-hidden rounded-[2rem] border border-white bg-white p-5 shadow-[0_20px_70px_rgba(0,0,0,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(236,72,153,.12)] md:p-6">
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-pink-50 transition group-hover:scale-125" />
                <div className="relative flex min-h-[220px] flex-col justify-between">
                  <div>
                    <span className="inline-flex rounded-full bg-pink-50 px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-pink-500">{index === 3 ? 'Mais completo' : 'Revenda'}</span>
                    <div className="mt-5 flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-pink-50 to-rose-100 text-center text-[10px] font-black uppercase tracking-widest text-pink-400">
                      SHE
                    </div>
                    <h3 className="mt-5 text-xl font-black tracking-tight">{product.name}</h3>
                    <p className="mt-1.5 max-w-sm text-xs leading-5 text-zinc-400">{product.description}</p>
                  </div>
                  <div className="mt-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.15em] text-zinc-400">Preço por unidade</p>
                      <p className="mt-1 text-2xl font-black text-zinc-950">{price > 0 ? brl(price) : '—'}</p>
                      <p className="mt-1 text-[10px] font-bold text-pink-500">5 un. = 5% · 10 = 10% · 15+ = 15%</p>
                    </div>
                    <div className="flex items-center rounded-2xl bg-zinc-950 p-1 text-white">
                      <button type="button" onClick={() => setQuantity(product.key, quantity <= 5 ? 0 : quantity - 5)} className="h-10 w-10 rounded-xl text-lg font-black transition hover:bg-white/10">−</button>
                      <div className="min-w-14 text-center">
                        <span className="block text-sm font-black">{quantity}</span>
                        <span className="block text-[8px] font-bold uppercase tracking-wider text-zinc-400">un.</span>
                      </div>
                      <button type="button" disabled={!price} onClick={() => setQuantity(product.key, quantity + 5)} className="h-10 w-10 rounded-xl text-lg font-black transition hover:bg-pink-500 disabled:cursor-not-allowed disabled:opacity-40">+</button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-[1.5rem] border border-white/80 bg-zinc-950/95 p-3 pl-5 text-white shadow-[0_20px_80px_rgba(0,0,0,.22)] backdrop-blur-xl">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.16em] text-zinc-400">Total do pedido</p>
            <p className="text-xl font-black">{brl(total)}</p>
          </div>
          <button onClick={checkout} disabled={!items.length || !pricesReady} className="rounded-xl bg-pink-500 px-5 py-3.5 text-xs font-black shadow-lg shadow-pink-500/20 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400">
            Pedir pelo WhatsApp →
          </button>
        </div>
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/40 p-3 backdrop-blur-sm sm:items-center" onMouseDown={e => e.target === e.currentTarget && setCartOpen(false)}>
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-pink-500">Seu pedido</p><h2 className="mt-1 text-2xl font-black">Carrinho</h2></div>
              <button onClick={() => setCartOpen(false)} className="h-9 w-9 rounded-full bg-zinc-100 font-black text-zinc-500">×</button>
            </div>
            <div className="mt-6 space-y-3">
              {items.length ? items.map(item => (
                <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl bg-zinc-50 p-3">
                  <div><p className="text-sm font-black">{item.quantity}x {item.name}</p><p className="text-xs text-zinc-400">{brl(item.unitPrice)} cada · {item.discountPercent}% OFF</p></div>
                  <p className="text-sm font-black">{brl(item.unitPrice * item.quantity)}</p>
                </div>
              )) : <p className="py-8 text-center text-sm text-zinc-400">Seu carrinho está vazio.</p>}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-5"><span className="text-sm font-bold text-zinc-400">Total</span><span className="text-2xl font-black">{brl(total)}</span></div>
            <button onClick={() => { setCartOpen(false); checkout() }} disabled={!items.length || !pricesReady} className="mt-5 w-full rounded-2xl bg-pink-500 px-5 py-4 text-sm font-black text-white transition hover:bg-pink-600 disabled:opacity-40">Abrir WhatsApp com meu pedido</button>
          </div>
        </div>
      )}
    </main>
  )
}

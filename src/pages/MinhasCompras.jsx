import { useState } from 'react'
import { Link } from 'react-router-dom'

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0))
const dateLabel = value => {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Data não informada' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}
const digits = value => String(value || '').replace(/\D/g, '')
const maskCpf = value => digits(value).length === 11 ? digits(value).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : value

export default function MinhasCompras() {
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setError('')
    setResult(null)
    if (digits(cpf).length !== 11) { setError('Digite os 11 números do seu CPF.'); return }
    setLoading(true)
    try {
      const response = await fetch('/api/customer-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cpf: digits(cpf) }) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Não foi possível consultar seus pedidos.')
      setResult(data)
    } catch (e) { setError(e.message || 'Não foi possível consultar seus pedidos agora.') }
    finally { setLoading(false) }
  }

  return <main className="min-h-screen bg-[#fff9fc] px-4 py-8 text-zinc-900 sm:px-6 sm:py-12">
    <div className="mx-auto max-w-4xl">
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" className="text-2xl font-black tracking-tight">SHE<span className="text-pink-500">.</span></Link>
        <Link to="/" className="rounded-full border border-pink-100 bg-white px-4 py-2 text-sm font-semibold text-zinc-600 hover:border-pink-300">Voltar ao início</Link>
      </header>
      <section className="mx-auto max-w-xl rounded-[2rem] border border-pink-100 bg-white p-6 shadow-[0_20px_70px_rgba(190,24,93,.08)] sm:p-9">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-2xl text-pink-500">♡</div>
        <p className="text-[10px] font-black uppercase tracking-[.22em] text-pink-500">Área da cliente</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Minhas Compras</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Informe o CPF usado no checkout para consultar seus pedidos, notas fiscais e rastreamento.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label htmlFor="customer-cpf" className="block text-xs font-bold text-zinc-600">CPF</label>
          <input id="customer-cpf" inputMode="numeric" autoComplete="off" maxLength={14} value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-50" />
          <button disabled={loading} className="w-full rounded-xl bg-pink-500 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-100 transition hover:bg-pink-600 disabled:cursor-wait disabled:opacity-60">{loading ? 'Consultando pedidos…' : 'Consultar minhas compras'}</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
      </section>

      {result && <section className="mt-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div>{result.customer_name && <p className="mb-2 text-lg font-bold text-zinc-800">Bem-vinda, {result.customer_name.split(/\s+/)[0]}! 💗</p>}<p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Seus pedidos</p><h2 className="mt-1 text-2xl font-black">Encontramos {result.orders?.length || 0} pedido(s)</h2></div>{result.cashback_balance_available && <div className="rounded-2xl border border-pink-100 bg-white px-5 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Cashback disponível</p><p className="mt-1 text-xl font-black text-pink-600">{money(result.cashback_balance)}</p></div>}</div>
        {!result.orders?.length && <div className="rounded-2xl border border-pink-100 bg-white p-6 text-sm leading-6 text-zinc-500">{result.message || 'Nenhum pedido encontrado para este CPF.'}</div>}
        {(result.orders || []).map(order => <article key={order.id} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4"><div><p className="text-xs text-zinc-400">Pedido #{order.number}</p><p className="mt-1 text-sm font-semibold">{dateLabel(order.date)}</p></div><span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600">{order.status || 'Status não informado'}</span></div>
          <div className="space-y-3 py-4">{(order.items || []).length ? order.items.map((item, i) => <div key={`${order.id}-${i}`} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-semibold text-zinc-800">{item.name}</p><p className="mt-1 text-xs text-zinc-400">Quantidade: {item.quantity}{item.sku ? ` · SKU: ${item.sku}` : ''}</p></div><p className="shrink-0 font-bold">{money(item.total ?? item.unit_price)}</p></div>) : <p className="text-sm text-zinc-500">Detalhes dos produtos indisponíveis neste momento.</p>}</div>
          <div className="border-t border-zinc-100 pt-4">
            <div className="mt-1 space-y-2 border-t border-zinc-100 pt-4 text-sm">
              <div className="flex items-center justify-between gap-4"><span className="text-zinc-500">Produtos</span><span className="font-semibold">{order.subtotal == null ? 'Não informado' : money(order.subtotal)}</span></div>
              {order.interest != null && Number(order.interest) !== 0 && <div className="flex items-center justify-between gap-4"><span className="text-zinc-500">Juros</span><span className="font-semibold">{money(order.interest)}</span></div>}
              {order.discount != null && Number(order.discount) !== 0 && <div className="flex items-center justify-between gap-4"><span className="text-zinc-500">Desconto</span><span className="font-semibold">− {money(Math.abs(Number(order.discount)))}</span></div>}
              <div className="flex items-center justify-between gap-4"><span className="text-zinc-500">Frete</span><span className="font-semibold">{order.shipping == null ? 'Não informado' : money(order.shipping)}</span></div>
              <div className="flex items-center justify-between gap-4 border-t border-zinc-100 pt-3"><span className="font-semibold text-zinc-700">Valor total</span><strong className="text-lg font-black">{money(order.total)}</strong></div>
              <div className="flex items-center justify-between gap-4 pt-1 text-xs"><span className="text-zinc-400">Pagamento</span><span className="font-semibold text-zinc-600">{order.payment_method || (order.payment_approved ? 'Aprovado' : 'Em processamento')}</span></div>
            </div>
            {order.shipping_method && <p className="mt-3 text-xs text-zinc-500">Entrega: {order.shipping_method}</p>}
            {order.customer_email && <p className="mt-1 text-xs text-zinc-500">E-mail do pedido: {order.customer_email}</p>}
          </div>
          {(order.invoice || order.tracking || order.cashback_generated !== null) && <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {order.invoice && <div className="rounded-xl bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Nota fiscal</p>{order.invoice.number && <p className="mt-1 text-sm font-bold">Nº {order.invoice.number}</p>}{order.invoice.key && <p className="mt-1 break-all text-xs text-zinc-500">Chave: {order.invoice.key}</p>}{order.invoice.url && <a href={order.invoice.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-pink-600 hover:text-pink-700">Visualizar nota fiscal ↗</a>}{!order.invoice.number && !order.invoice.key && !order.invoice.url && <p className="mt-1 text-sm text-zinc-500">Informação indisponível</p>}</div>}
            <div className={`rounded-2xl border p-4 ${order.tracking?.url ? 'border-pink-100 bg-zinc-50' : 'border-pink-100 bg-gradient-to-br from-pink-50 via-white to-rose-50 shadow-sm'}`}>
              {order.tracking?.url ? <><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Rastreamento</p>{order.tracking.carrier && <p className="mt-1 text-sm font-semibold">{order.tracking.carrier}</p>}{order.tracking.code && <p className="mt-1 break-all text-sm font-bold">{order.tracking.code}</p>}<div className="mt-4 flex flex-wrap items-center gap-3"><a href={order.tracking.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-pink-500 px-4 py-2 text-center text-xs font-black text-white hover:bg-pink-600">Acompanhar entrega ↗</a><a href={`https://wa.me/553132784332?text=${encodeURIComponent(`Olá, tenho dúvidas sobre o meu pedido número ${order.number || order.id}.`)}`} target="_blank" rel="noreferrer" aria-label={`Fale com a She pelo WhatsApp sobre o pedido ${order.number || order.id}`} className="ml-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-center text-xs font-black text-white shadow-sm transition hover:bg-[#1ebe5d]"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="currentColor"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.47 0 .1 5.37.1 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.94 11.94 0 0 0 5.88 1.5h.01c6.61 0 11.98-5.37 11.98-11.98 0-3.2-1.25-6.2-3.55-8.41ZM12.09 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.68.97.98-3.59-.23-.37a9.83 9.83 0 0 1-1.51-5.24c0-5.44 4.43-9.87 9.88-9.87a9.8 9.8 0 0 1 6.98 2.89 9.8 9.8 0 0 1 2.89 6.99c0 5.44-4.43 9.87-9.89 9.87Zm5.42-7.39c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.13-.15.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.49-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.17-1.3.1-1.42-.07-.07-.27-.17-.47-.27Z"/></svg><span>Fale com a She</span></a></div></> : <><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg></div><div><p className="text-sm font-black text-zinc-800">Pedido em preparação</p><p className="mt-1 text-sm leading-6 text-zinc-500">Em breve será disponibilizado o link para rastreio.</p></div></div><div className="mt-4 flex justify-end"><a href={`https://wa.me/553132784332?text=${encodeURIComponent(`Olá, tenho dúvidas sobre o meu pedido número ${order.number || order.id}.`)}`} target="_blank" rel="noreferrer" aria-label={`Fale com a She pelo WhatsApp sobre o pedido ${order.number || order.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-center text-xs font-black text-white shadow-sm transition hover:bg-[#1ebe5d]"><svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0" fill="currentColor"><path d="M20.52 3.48A11.86 11.86 0 0 0 12.08 0C5.47 0 .1 5.37.1 11.98c0 2.11.55 4.17 1.6 5.99L0 24l6.2-1.63a11.94 11.94 0 0 0 5.88 1.5h.01c6.61 0 11.98-5.37 11.98-11.98 0-3.2-1.25-6.2-3.55-8.41ZM12.09 21.8a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.68.97.98-3.59-.23-.37a9.83 9.83 0 0 1-1.51-5.24c0-5.44 4.43-9.87 9.88-9.87a9.8 9.8 0 0 1 6.98 2.89 9.8 9.8 0 0 1 2.89 6.99c0 5.44-4.43 9.87-9.89 9.87Zm5.42-7.39c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.15.3-.35.45-.52.13-.15.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.49-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.17-1.3.1-1.42-.07-.07-.27-.17-.47-.27Z"/></svg><span>Fale com a She</span></a></div></>}</div>
          </div>}
          {order.cashback_generated !== null && order.cashback_generated !== undefined && <p className="mt-4 text-sm text-pink-600">Cashback gerado neste pedido: <strong>{money(order.cashback_generated)}</strong></p>}
        </article>)}
      </section>}
    </div>
  </main>
}

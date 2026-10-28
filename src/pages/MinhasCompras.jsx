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
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-500">Seus pedidos</p><h2 className="mt-1 text-2xl font-black">Encontramos {result.orders?.length || 0} pedido(s)</h2></div>{result.cashback_balance_available && <div className="rounded-2xl border border-pink-100 bg-white px-5 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Cashback disponível</p><p className="mt-1 text-xl font-black text-pink-600">{money(result.cashback_balance)}</p></div>}</div>
        {!result.orders?.length && <div className="rounded-2xl border border-pink-100 bg-white p-6 text-sm leading-6 text-zinc-500">{result.message || 'Nenhum pedido encontrado para este CPF.'}</div>}
        {(result.orders || []).map(order => <article key={order.id} className="rounded-2xl border border-pink-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-4"><div><p className="text-xs text-zinc-400">Pedido #{order.number}</p><p className="mt-1 text-sm font-semibold">{dateLabel(order.date)}</p></div><span className="rounded-full bg-pink-50 px-3 py-1.5 text-xs font-black text-pink-600">{order.status || 'Status não informado'}</span></div>
          <div className="space-y-3 py-4">{(order.items || []).length ? order.items.map((item, i) => <div key={`${order.id}-${i}`} className="flex items-start justify-between gap-4 text-sm"><div><p className="font-semibold text-zinc-800">{item.name}</p><p className="mt-1 text-xs text-zinc-400">Quantidade: {item.quantity}{item.sku ? ` · SKU: ${item.sku}` : ''}</p></div><p className="shrink-0 font-bold">{money(item.total ?? item.unit_price)}</p></div>) : <p className="text-sm text-zinc-500">Detalhes dos produtos indisponíveis neste momento.</p>}</div>
          <div className="border-t border-zinc-100 pt-4">
            <div className="flex items-center justify-between gap-4"><span className="text-sm text-zinc-500">Total do pedido</span><strong className="text-lg font-black">{money(order.total)}</strong></div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Produtos</p><p className="mt-1 text-sm font-bold">{money(order.subtotal)}</p></div>
              <div className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Frete</p><p className="mt-1 text-sm font-bold">{order.shipping == null ? 'Não informado' : money(order.shipping)}</p></div>
              <div className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Desconto</p><p className="mt-1 text-sm font-bold">{order.discount == null ? 'Não informado' : money(order.discount)}</p></div>
              <div className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Juros</p><p className="mt-1 text-sm font-bold">{order.interest == null ? 'Não informado' : money(order.interest)}</p></div>
              <div className="rounded-xl bg-zinc-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">Pagamento</p><p className="mt-1 text-sm font-bold">{order.payment_method || (order.payment_approved ? 'Aprovado' : 'Em processamento')}</p></div>
            </div>
            {order.shipping_method && <p className="mt-3 text-xs text-zinc-500">Entrega: {order.shipping_method}</p>}
            {order.customer_email && <p className="mt-1 text-xs text-zinc-500">E-mail do pedido: {order.customer_email}</p>}
          </div>
          {(order.invoice || order.tracking || order.cashback_generated !== null) && <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {order.invoice && <div className="rounded-xl bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Nota fiscal</p>{order.invoice.number && <p className="mt-1 text-sm font-bold">Nº {order.invoice.number}</p>}{order.invoice.key && <p className="mt-1 break-all text-xs text-zinc-500">Chave: {order.invoice.key}</p>}{order.invoice.url && <a href={order.invoice.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-bold text-pink-600 hover:text-pink-700">Visualizar nota fiscal ↗</a>}{!order.invoice.number && !order.invoice.key && !order.invoice.url && <p className="mt-1 text-sm text-zinc-500">Informação indisponível</p>}</div>}
            {order.tracking && <div className="rounded-xl bg-zinc-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Rastreamento</p>{order.tracking.carrier && <p className="mt-1 text-sm font-semibold">{order.tracking.carrier}</p>}{order.tracking.code && <p className="mt-1 break-all text-sm font-bold">{order.tracking.code}</p>}{order.tracking.url ? <a href={order.tracking.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-lg bg-pink-500 px-3 py-2 text-xs font-black text-white hover:bg-pink-600">Acompanhar entrega ↗</a> : <p className="mt-2 text-xs text-zinc-500">Código de rastreio disponível; o link ainda não foi informado pela transportadora.</p>}</div>}
          </div>}
          {order.cashback_generated !== null && order.cashback_generated !== undefined && <p className="mt-4 text-sm text-pink-600">Cashback gerado neste pedido: <strong>{money(order.cashback_generated)}</strong></p>}
          {!order.invoice && !order.tracking && <p className="mt-4 text-xs text-zinc-400">Nota fiscal e rastreamento aparecerão aqui assim que essas informações forem disponibilizadas na Yampi.</p>}
        </article>)}
        {result.cashback_balance === null && <p className="text-xs leading-5 text-zinc-400">O saldo acumulado de cashback só será exibido se a integração da Yampi disponibilizar esse dado pela API. Os valores gerados por pedido são exibidos separadamente quando presentes.</p>}
      </section>}
      <p className="mx-auto mt-8 max-w-xl text-center text-[11px] leading-5 text-zinc-400">Por segurança, use o CPF informado na compra. Se seu pedido foi feito há poucos minutos, aguarde a sincronização da loja.</p>
    </div>
  </main>
}

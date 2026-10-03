import { Link } from 'react-router-dom'

export default function TrabalheConosco() {
  return (
    <main className="min-h-screen bg-[#fffafc] text-zinc-950">
      <section className="mx-auto max-w-5xl px-5 py-14 md:px-8 md:py-24">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[.28em] text-pink-500">She</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Trabalhe com a She.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-zinc-500 md:text-lg">
            A She trabalha com parceiros independentes em dois modelos: afiliadas, para divulgação e geração de vendas por links de indicação, e representantes, para relacionamento comercial e oportunidades de venda.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <article className="rounded-[2rem] border border-pink-100 bg-white p-7 shadow-sm md:p-9">
            <p className="text-xs font-black uppercase tracking-[.2em] text-pink-500">Afiliadas</p>
            <h2 className="mt-2 text-2xl font-black">Divulgue seus produtos favoritos.</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">Crie seu link exclusivo, divulgue a She nos seus canais e receba comissão pelas vendas elegíveis atribuídas ao seu link. O programa é uma parceria comercial independente.</p>
            <Link to="/afiliado" className="mt-6 inline-flex rounded-xl bg-pink-500 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-600">Quero ser afiliada</Link>
          </article>

          <article className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-9">
            <p className="text-xs font-black uppercase tracking-[.2em] text-zinc-400">Representantes</p>
            <h2 className="mt-2 text-2xl font-black">Construa oportunidades comerciais.</h2>
            <p className="mt-4 text-sm leading-6 text-zinc-500">O modelo de representantes será voltado para parceiros comerciais que desejam desenvolver relacionamento com lojas, profissionais e outros pontos de venda.</p>
            <Link to="/representantes" className="mt-6 inline-flex rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-pink-500">Conhecer representantes</Link>
          </article>
        </div>

        <div className="mt-8 rounded-[2rem] border border-zinc-100 bg-white p-7 text-center shadow-sm md:p-9">
          <h2 className="text-xl font-black">Quer falar com a She?</h2>
          <p className="mt-2 text-sm text-zinc-500">Entre em contato com nosso suporte comercial.</p>
          <a href="https://wa.me/553132784332" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-800 hover:border-pink-300 hover:text-pink-500">Falar com a She</a>
        </div>
      </section>
    </main>
  )
}

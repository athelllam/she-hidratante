import { Link } from 'react-router-dom'

export default function Representantes() {
  return (
    <main className="min-h-screen bg-[#fffafc] text-zinc-950">
      <section className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-5 py-16 text-center">
        <div className="rounded-[2rem] border border-pink-100 bg-white p-8 shadow-[0_30px_100px_rgba(0,0,0,.08)] md:p-12">
          <p className="text-xs font-black uppercase tracking-[.28em] text-pink-500">She Representantes</p>
          <h1 className="mt-3 text-4xl font-black">Em breve.</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500">Estamos preparando a estrutura do programa de representantes da She. Em breve esta página terá as informações, condições e acesso ao programa.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/trabalhe-conosco" className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700 hover:border-pink-300 hover:text-pink-500">Voltar para Trabalhe Conosco</Link>
            <Link to="/afiliado" className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-black text-white hover:bg-pink-600">Quero ser afiliada</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

import { Link } from 'react-router-dom'
import logo from '../assets/she-logo.webp'

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-[#fffafc] text-zinc-800">
      <header className="border-b border-zinc-200/70 bg-white/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/"><img src={logo} alt="She" className="w-28 md:w-32" /></Link>
          <Link to="/" className="text-sm font-semibold text-zinc-700 hover:text-black">Voltar para o site</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <p className="text-pink-500 text-sm font-bold tracking-[0.3em] uppercase">She Coisa de Mulher</p>
        <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight">Termos de Uso</h1>
        <p className="mt-5 text-zinc-500">Última atualização: 29 de setembro de 2026</p>
        <div className="mt-12 space-y-10 text-base md:text-lg leading-8 text-zinc-600">
          <section><h2 className="text-2xl font-bold text-black mb-3">1. Aceitação</h2><p>Ao acessar e utilizar o site da She Coisa de Mulher, você concorda com estes Termos de Uso. Caso não concorde com alguma disposição, recomendamos que não utilize o site.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">2. Produtos e informações</h2><p>As informações, imagens, descrições e preços apresentados no site destinam-se a informar sobre os produtos oferecidos. A disponibilidade, condições comerciais e demais informações aplicáveis ao pedido serão aquelas apresentadas no momento da contratação.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">3. Pedidos e pagamento</h2><p>Pedidos estão sujeitos à disponibilidade, confirmação dos dados e aprovação do pagamento pelos meios disponibilizados. A conclusão da compra e as condições específicas do pedido serão apresentadas durante o processo de contratação.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">4. Entrega e atendimento</h2><p>As condições e prazos de entrega aplicáveis serão informados durante a compra. Em caso de dúvidas, divergências ou problemas com um pedido, o cliente poderá utilizar o canal de atendimento da She para solicitar suporte.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">5. Trocas, devoluções e arrependimento</h2><p>Trocas, devoluções e exercício do direito de arrependimento observarão a legislação brasileira aplicável e as condições informadas no momento da compra. Quando aplicável, o consumidor poderá exercer os direitos previstos no Código de Defesa do Consumidor.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">6. Propriedade intelectual</h2><p>Textos, imagens, marcas, identidade visual, vídeos, códigos e demais elementos do site pertencem à She Coisa de Mulher ou são utilizados com autorização. Não é permitida a reprodução ou exploração comercial sem autorização, ressalvadas as hipóteses permitidas pela legislação.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">7. Uso adequado</h2><p>O usuário se compromete a utilizar o site de maneira lícita e a não tentar interferir em seu funcionamento, obter acesso não autorizado, introduzir códigos maliciosos ou praticar qualquer atividade que possa causar dano ao site, à empresa ou a terceiros.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">8. Limitação de informações</h2><p>Conteúdos informativos publicados no site não substituem avaliação ou orientação profissional quando esta for necessária. O usuário deve observar as instruções e informações específicas fornecidas para cada produto.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">9. Alterações</h2><p>Estes Termos podem ser atualizados para refletir mudanças legais, comerciais ou operacionais. A versão publicada nesta página será a versão vigente.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">10. Contato</h2><p>Para atendimento, entre em contato pelo WhatsApp <a className="text-pink-600 font-semibold" href="https://wa.me/553132784332" target="_blank" rel="noreferrer">(31) 3278-4332</a>.</p><p className="mt-3">CNPJ: 51.327.547/0001-37.</p></section>
        </div>
      </main>
    </div>
  )
}

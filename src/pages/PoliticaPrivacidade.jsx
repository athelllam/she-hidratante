import { Link } from 'react-router-dom'
import logo from '../assets/she-logo.webp'

export default function PoliticaPrivacidade() {
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
        <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight">Política de Privacidade</h1>
        <p className="mt-5 text-zinc-500">Última atualização: 29 de setembro de 2026</p>

        <div className="mt-12 space-y-10 text-base md:text-lg leading-8 text-zinc-600">
          <section><h2 className="text-2xl font-bold text-black mb-3">1. Sobre esta política</h2><p>Esta Política de Privacidade explica como a She Coisa de Mulher trata informações pessoais quando você acessa nosso site, entra em contato conosco ou realiza uma compra. O tratamento deve observar a legislação brasileira aplicável, especialmente a Lei Geral de Proteção de Dados Pessoais (LGPD).</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">2. Quais dados podem ser coletados</h2><p>Dependendo da interação realizada, podemos tratar dados fornecidos por você, como nome, telefone, e-mail, endereço de entrega e informações necessárias para atendimento e processamento de pedidos. Também podem ser coletados dados técnicos de navegação, como endereço IP, dispositivo, navegador e informações relacionadas ao uso do site.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">3. Para que usamos os dados</h2><p>Os dados podem ser utilizados para atender solicitações, processar e acompanhar pedidos, realizar entregas, prestar suporte, melhorar o site e a experiência de navegação, prevenir fraudes e cumprir obrigações legais ou regulatórias.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">4. Cookies</h2><p>O site pode utilizar cookies e tecnologias semelhantes para funcionamento, segurança, análise de uso e, quando aplicável, personalização de conteúdo. Você pode controlar cookies pelas configurações do seu navegador, observadas as consequências para algumas funcionalidades.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">5. Compartilhamento</h2><p>Quando necessário para as finalidades descritas nesta política, informações podem ser compartilhadas com prestadores de serviços que apoiam operações como tecnologia, pagamento, atendimento, logística e segurança, sempre dentro das bases legais aplicáveis. Também podemos compartilhar dados quando houver obrigação legal ou determinação de autoridade competente.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">6. Segurança e retenção</h2><p>Adotamos medidas técnicas e organizacionais razoáveis para proteger os dados contra acessos não autorizados, perda, alteração ou divulgação indevida. Os dados são mantidos pelo período necessário às finalidades do tratamento e às obrigações legais aplicáveis.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">7. Seus direitos</h2><p>Nos termos da LGPD e conforme aplicável ao caso, você pode solicitar informações sobre o tratamento, confirmação de existência, acesso, correção, atualização e outras medidas previstas em lei. Solicitações podem ser encaminhadas pelos canais de contato disponibilizados pela She.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">8. Contato</h2><p>Para dúvidas ou solicitações relacionadas à privacidade, entre em contato pelo canal de atendimento da She: WhatsApp <a className="text-pink-600 font-semibold" href="https://wa.me/553132784332" target="_blank" rel="noreferrer">(31) 3278-4332</a>.</p><p className="mt-3">CNPJ: 51.327.547/0001-37.</p></section>
          <section><h2 className="text-2xl font-bold text-black mb-3">9. Atualizações</h2><p>Esta política poderá ser atualizada para refletir mudanças legais, operacionais ou tecnológicas. A versão publicada nesta página será considerada a versão vigente.</p></section>
        </div>
      </main>
    </div>
  )
}

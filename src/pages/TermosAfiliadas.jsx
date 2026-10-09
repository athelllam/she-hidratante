import { Link } from 'react-router-dom'

export default function TermosAfiliadas() {
  return (
    <main className="min-h-screen bg-[#fffafc] text-zinc-950">
      <section className="mx-auto max-w-4xl px-5 py-14 md:px-8 md:py-20">
        <div className="rounded-[2rem] border border-pink-100 bg-white p-7 shadow-sm md:p-10">
          <p className="text-xs font-black uppercase tracking-[.22em] text-pink-500">She Afiliadas</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Termos e Condições das Afiliadas</h1>
          <div className="mt-8 space-y-5 text-sm leading-7 text-zinc-600">
            <p><strong>1. Natureza da relação.</strong> O programa de afiliadas é uma relação comercial independente para divulgação de produtos e geração de vendas. A afiliada atua por sua própria conta e risco, sem salário, jornada, controle de ponto, subordinação, exclusividade ou garantia de remuneração mínima.</p>
            <p><strong>2. Autonomia.</strong> A afiliada organiza livremente seus horários, métodos, canais e rotina de divulgação, podendo exercer outras atividades e trabalhar com outras empresas, respeitando a legislação e estes termos.</p>
            <p><strong>3. Bonificações.</strong> Os valores pagos decorrem exclusivamente de vendas elegíveis atribuídas ao link da afiliada e das regras comerciais vigentes. Bonificação não constitui salário, ajuda de custo, benefício ou remuneração por disponibilidade.</p>
            <p><strong>4. Reestruturação e alterações do plano de bonificação.</strong> A afiliada declara estar ciente e aceitar que, em caso de reestruturação do programa, a SHE poderá alterar, substituir ou reorganizar os planos de bonificação, critérios de elegibilidade, valores de comissão e regras de cálculo. As alterações poderão influenciar os critérios e valores de cálculo das comissões, bem como o saldo atual e futuro da afiliada. A SHE comunicará qualquer alteração na estrutura com antecedência mínima de 30 (trinta) dias corridos, por aviso na plataforma e/ou pelos canais de contato cadastrados. Durante esse prazo, a afiliada poderá se programar e solicitar as movimentações de saldo disponíveis que desejar realizar antes da entrada em vigor das mudanças. Ao término do prazo informado, as novas regras poderão ser aplicadas conforme a reestruturação comunicada, inclusive com impacto na apuração das comissões e na composição, disponibilidade e movimentação do saldo existente e futuro, observada a legislação aplicável.</p>
            <p><strong>5. Saques.</strong> Solicitações de saque estão sujeitas à conferência e processamento e podem levar até 3 dias.</p>
            <p><strong>6. Conteúdo.</strong> A afiliada deve divulgar os produtos de forma verdadeira e responsável, sem promessas de resultados garantidos, alegações não autorizadas ou conteúdo que viole direitos de terceiros.</p>
            <p><strong>7. Sistema de equipes.</strong> O sistema de equipes não é um sistema de pirâmide financeira. Não há cobrança para recrutar pessoas nem pagamento simplesmente pelo recrutamento. A equipe é um mecanismo de incentivo comercial destinado a recompensar a afiliada mãe pelo suporte, treinamento e orientação oferecidos às afiliadas de sua equipe.</p>
            <p><strong>8. Vídeos.</strong> Solicitações de aprovação de vídeos podem levar até 15 dias. A aprovação depende da análise da She e não garante utilização do conteúdo.</p>
            <p><strong>9. Conduta.</strong> São proibidas fraude, autoindicação indevida, pedidos fictícios, spam, informações falsas, práticas enganosas e manipulação de vendas.</p>
            <p><strong>10. Encerramento.</strong> A She poderá suspender ou encerrar o acesso ao programa em caso de descumprimento destes termos, fraude ou outras situações previstas nas regras comerciais.</p>
          </div>
          <Link to="/afiliado" className="mt-8 inline-flex rounded-xl bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-pink-500">Voltar para área da afiliada</Link>
        </div>
      </section>
    </main>
  )
}

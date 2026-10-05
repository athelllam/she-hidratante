# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## WhatsApp e PIX de recebimento

A migration do `supabase/schema.sql` adiciona:
- `affiliates.whatsapp`: número usado pelo administrativo para abrir conversa no WhatsApp.
- `affiliates.pix_key`: PIX atual cadastrado pela afiliada.
- `affiliate_withdrawals.pix_key`: cópia do PIX usado no momento de cada solicitação de saque.

A afiliada pode substituir o PIX pelo painel. Saques novos usam a nova chave; saques antigos preservam a chave que foi registrada quando foram solicitados.


## Configurações administrativas de comissão

A migration `supabase/schema.sql` cria a tabela `affiliate_settings` com os valores globais de meta de ticket médio e comissão por faixa. Execute o SQL no Supabase antes de publicar esta versão.

No painel `/admin`, o administrador pode alterar:
- meta de ticket médio (padrão R$ 170,00);
- comissão Início (padrão R$ 30,00/pedido);
- comissão Bronze (padrão R$ 40,00/pedido);
- comissão Prata (padrão R$ 50,00/pedido);
- comissão Ouro (padrão R$ 60,00/pedido).

O bônus de ticket permanece em R$ 5,00/pedido e o sistema passa a usar a meta configurada pelo administrador. A alteração é refletida no cálculo de comissão e nos textos/valores exibidos no painel das afiliadas.

## Exclusão múltipla

As afiliadas agora são selecionadas por um botão liga/desliga, sempre desmarcado ao entrar/atualizar o painel. A exclusão é feita por um único botão e exige duas confirmações: confirmação inicial do navegador e digitação de `EXCLUIR` na confirmação final.


## WhatsApp

Além da recuperação de senha, o sistema envia alertas de saque, vídeo, nova afiliada por impulso e saque aprovado. O número administrativo configurado atualmente em `.env.example` é +55 31 99651-4332; o número +55 31 3278-4332 é o remetente da She na Meta.

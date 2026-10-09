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


## E-mail transacional (Resend)

Esta versão usa somente e-mail transacional via Resend.

Configure `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAILS` e `SITE_URL` no Vercel.

Notificações: nova solicitação de saque e novo vídeo para o administrador; nova afiliada por Impulsionar Equipe e saque aprovado/pago para a afiliada; recuperação de senha por e-mail. Não há notificações de vendas por e-mail.

### Banco

Para um banco já existente, execute `supabase/migration_email_notifications.sql` uma vez para criar o marcador de idempotência do aviso de saque aprovado. A tabela de tokens de recuperação já existe nas migrations anteriores e também está no `schema.sql`.

## Landing pública do programa de afiliadas

A rota `/programa-afiliadas` carrega os valores públicos diretamente de `GET /api/affiliate/auth?action=public_settings`. A página não usa valores de comissões, metas, ticket médio ou Impulsionar Equipe hardcoded no frontend.

Os valores públicos são os mesmos do painel administrativo: metas do Bônus Mensal, metas do Bônus Fixo, comissões por nível, meta e bônus de ticket, comissão de equipe e planos/capacidade do Impulsionar Equipe.

O campo `Bônus de ticket · por pedido` foi disponibilizado no bloco de configurações administrativas e grava em `affiliate_settings.ticket_bonus`.

## Dados do administrador
O painel possui a seção **Dados** para login, e-mail de login, troca de senha e múltiplos destinatários de notificações. Antes de usar, execute `supabase/migration_admin_profile_settings.sql` no SQL Editor do Supabase. Consulte `ADMIN-DADOS-SETUP.md`.

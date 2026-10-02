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

# She Afiliadas — notificações push

Esta versão adiciona notificações push para eventos de vendas/comissões, saques e avisos administrativos enviados pelo painel.

## O que foi incluído
- Venda aprovada na Yampi: notifica a afiliada que realizou a venda; se ela pertence a uma equipe, notifica também a líder direta.
- Saque aprovado/enviado, pago, recusado ou falhou: notifica a afiliada no fluxo administrativo e no webhook Woovi.
- Painel admin: seção “Avisos administrativos por push” com título e mensagem editáveis, enviando para todas as inscrições ativas.
- Reutiliza a rota existente `/api/admin/withdrawals` para o envio administrativo e o roteador catch-all existente para manter o limite de funções serverless.
- Inscrições que retornam HTTP 404/410 são marcadas inativas.

## Variáveis Vercel necessárias
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (valor válido, por exemplo `mailto:suporte@seudominio.com.br`)

Não exponha a chave privada no navegador nem no GitHub. Não é necessária nova migração SQL para esta alteração; ela usa `affiliate_push_subscriptions` já criada.

## Publicação e teste
1. Substitua os arquivos do projeto mantendo as pastas.
2. Commit/push para o GitHub e aguarde o deploy Vercel.
3. No admin, envie primeiro um aviso de teste para todos os apps autorizados.
4. Teste uma venda aprovada e o fluxo de saque em ambiente controlado. Webhooks reais de venda e pagamento devem continuar configurados.

A entrega não foi testada contra o Supabase/Vercel reais. A sintaxe dos handlers CommonJS alterados foi validada com `node --check`; valide o build Vite e teste em produção antes de depender das notificações para processos críticos.

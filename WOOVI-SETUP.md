# Configuração da Woovi — saques automáticos Pix

## Variáveis no Vercel

Configure em **Project → Settings → Environment Variables**:

- `WOOVI_APP_ID`: AppID/API key gerada no painel Woovi. Mantenha somente no backend.
- `WOOVI_API_URL`: `https://api.woovi.com` para produção. Para sandbox, use `https://api.woovi-sandbox.com`.
- `WOOVI_WEBHOOK_TOKEN`: segredo aleatório longo (pelo menos 32 caracteres), usado para proteger o endpoint de webhook.

Depois de alterar variáveis, faça um novo deploy.

## Fluxo de saque

1. A afiliada solicita o saque; o valor fica reservado.
2. No painel admin, clique em **Aprovar**.
3. O backend bloqueia a solicitação contra processamento concorrente e chama `POST /api/v1/payment` da Woovi com `type: PIX_KEY`, valor em centavos, chave Pix, tipo e `correlationID` único da solicitação.
4. O backend usa `autoApprove: true`. A solicitação permanece `processing` até a confirmação final; isso evita liberar o saldo enquanto a transferência não estiver confirmada.
5. O webhook atualiza para `paid`, `failed` ou `cancelled`. Em caso de falha, a reserva é liberada pelas regras existentes do painel.

## Webhook Woovi

Configure na Woovi o endereço:

`https://SEU-DOMINIO/api/webhooks/woovi?token=SEU_WOOVI_WEBHOOK_TOKEN`

Assine os eventos `OPENPIX:MOVEMENT_CONFIRMED`, `OPENPIX:MOVEMENT_FAILED` e `OPENPIX:MOVEMENT_REMOVED`.

A Woovi também fornece assinatura criptográfica no header `x-webhook-signature`; o endpoint usa o token secreto da URL como camada de autenticação. Não compartilhe a URL completa do webhook.

## Banco de dados

Antes de publicar, execute `supabase/migration_woovi_withdrawals.sql` no SQL Editor do Supabase. A migração adiciona os campos de acompanhamento e a tabela de deduplicação dos webhooks.

## Importante antes de produção

- Confirme com a Woovi que o AppID tem permissão para criar/aprovar pagamentos de saída Pix (`POST /api/v1/payment`) e que a conta tem saldo/limites habilitados.
- Teste primeiro com sandbox e uma chave controlada.
- A API da Woovi recebe valores em centavos: R$ 100,00 é enviado como `10000`.
- A chave de API nunca deve ser colocada no frontend.
- Se houver timeout de rede, o saque fica em processamento e continua reservado. Confira o pagamento na Woovi antes de qualquer intervenção; isso evita duplicidade.

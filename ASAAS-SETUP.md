# Configuração dos saques automáticos via Asaas

A nova versão mantém o fluxo atual de saque:
1. Afiliada solicita R$100, R$200, R$300... conforme o saldo.
2. A solicitação fica Pendente.
3. O administrador clica em "Aprovar e enviar Pix".
4. O backend cria a transferência Pix no Asaas.
5. O Asaas envia o resultado para `/api/webhooks/asaas`.
6. O painel muda para Pago, Falhou ou Cancelado.

## 1. Supabase

Execute uma vez no SQL Editor:

`supabase/migration_asaas_withdrawals.sql`

Não é necessário apagar ou recriar tabelas existentes.

## 2. Variáveis no Vercel

Adicione somente no ambiente do servidor:

- `ASAAS_API_KEY` = sua API Key do Asaas
- `ASAAS_API_URL` = `https://api.asaas.com/v3`
- `ASAAS_WEBHOOK_TOKEN` = um token aleatório seguro com pelo menos 32 caracteres

A `ASAAS_API_KEY` nunca deve ser colocada no frontend.

## 3. Chave Pix da afiliada

O cadastro de Pix agora possui:

- CPF
- CNPJ
- E-mail
- Telefone
- Chave aleatória

A chave e o tipo ficam gravados também na solicitação do saque, preservando o destino usado naquele pedido.

## 4. Webhook do Asaas

No Asaas, crie um Webhook com:

URL:
`https://SEU-DOMINIO/api/webhooks/asaas`

Auth Token:
o mesmo valor definido em `ASAAS_WEBHOOK_TOKEN`

Eventos necessários:

- `TRANSFER_CREATED`
- `TRANSFER_PENDING`
- `TRANSFER_IN_BANK_PROCESSING`
- `TRANSFER_BLOCKED`
- `TRANSFER_DONE`
- `TRANSFER_FAILED`
- `TRANSFER_CANCELLED`

Recomenda-se usar envio sequencial.

## 5. Segurança

Não coloque a API Key no navegador.

O endpoint do webhook valida o header `asaas-access-token` e registra o ID único de cada evento para impedir processamento duplicado.

## 6. Teste

Antes de usar dinheiro real, configure temporariamente:

`ASAAS_API_URL=https://api-sandbox.asaas.com/v3`

e use uma API Key do ambiente Sandbox.

Faça um saque de teste, aprove no Admin e confirme que:
- a transferência é criada;
- o webhook chega;
- o status é atualizado;
- uma repetição do webhook não duplica o pagamento.

Depois troque para:

`https://api.asaas.com/v3`

e use a API Key de produção.

## Arquitetura Vercel

A API foi consolidada em uma única Serverless Function (`api/[...path].js`). Os demais handlers ficam em `api/_handlers/`, que não são expostos como funções individuais. Assim, a integração do Asaas não adiciona uma nova função além do limite atual.

## Reserva do saldo

O valor do saque é descontado/reservado imediatamente quando a afiliada solicita. Solicitações `pending`, `approved` e `processing` continuam reservando o valor. Se o saque for `rejected`, `failed` ou `cancelled`, o valor deixa de ser reservado e volta automaticamente ao saldo disponível.


### Atualização dos mínimos de saque
Execute a migration `supabase/migration_withdrawal_minimums.sql`. Ela também concede `EXECUTE` da RPC ao `service_role`, usado pelo backend da Vercel. Se a migration já foi executada antes, execute novamente: o `CREATE OR REPLACE FUNCTION` e o `GRANT` são seguros.

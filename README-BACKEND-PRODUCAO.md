# She Afiliadas — backend de produção

## O que foi implementado

- Cadastro real de afiliadas.
- Login real com Supabase Auth.
- Sessão em cookie HttpOnly/Secure.
- Afiliada vinculada a `auth_user_id`.
- Slug público único.
- Rotas dinâmicas `/slug`, `/slug/welcome`, `/slug/hidratante`, `/slug/stick`.
- Acessos e cliques gravados no banco.
- Checkout Yampi com `metadata[affiliate_id]`.
- Webhook Yampi para criar/atualizar pedidos atribuídos.
- Sincronização por API da Yampi para o dashboard, sem exigir um novo webhook.
- Comissão calculada pela taxa da afiliada.
- Cancelamento/reembolso deixa de compor o faturamento/comissão disponível.
- Solicitação de saque.
- Endpoints administrativos para afiliadas e saques.
- Dashboard real com métricas, gráfico, pedidos e saldo disponível.
- QR Code do link público.

## 1. Supabase

Crie um projeto no Supabase e execute `supabase/schema.sql` no SQL Editor.

Depois copie:
- Project URL → `SUPABASE_URL`
- anon/public key → `SUPABASE_ANON_KEY`
- service_role key → `SUPABASE_SERVICE_ROLE_KEY`

A `service_role` deve existir **somente nas variáveis do backend/Vercel**. Nunca coloque essa chave no React.

## 2. Variáveis Vercel

Configure:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
YAMPI_WEBHOOK_SECRET=...
YAMPI_ALIAS=... # opcional
YAMPI_USER_TOKEN=...
YAMPI_USER_SECRET_KEY=...
YAMPI_SYNC_DAYS=365
YAMPI_SYNC_MAX_ORDERS=2000
ADMIN_EMAILS=seu-email@dominio.com
```

## 3. Yampi

A integração principal do painel usa a API da Yampi, então você **não precisa apagar nem alterar os 3 webhooks atuais**.

A API usa `User-Token` + `User-Secret-Key` e o endpoint de pedidos retorna o `metadata` do pedido. Se `YAMPI_ALIAS` ficar vazio, o backend descobre automaticamente o alias da loja através de `POST /v2/auth/me`. O site já envia `metadata[affiliate_id]=ID_DA_AFILIADA` nos links de checkout.

Configure no Vercel:

```text
YAMPI_ALIAS= # opcional
YAMPI_USER_TOKEN=...
YAMPI_USER_SECRET_KEY=...
YAMPI_SYNC_DAYS=365
YAMPI_SYNC_MAX_ORDERS=2000
```

Depois de salvar as variáveis e fazer novo deploy, o painel passa a ter o botão **Atualizar Yampi**. Ao atualizar, o backend consulta os pedidos da Yampi, procura `affiliate_id` no metadata e grava/atualiza somente os pedidos daquela afiliada em `affiliate_orders`.

O webhook existente continua compatível e pode ser usado futuramente para atualização em tempo real; a sincronização por API funciona como fonte de reconciliação sem consumir uma nova vaga de webhook.

A Yampi documenta que metadata é salvo no pedido e pode ser consultado via API/webhooks, e que `GET /{alias}/orders` suporta paginação por `scroll_id`.

## 4. Deploy

Copie para a raiz do projeto:
- `api/`
- `supabase/`
- `.env.example`

O `src/` desta entrega já contém as alterações de frontend.

## Observação

O código está preparado para Vercel Serverless + Supabase e não depende de uma biblioteca adicional de backend. As credenciais da sua conta Supabase/Yampi são a única parte que não pode ser criada por código dentro do ZIP.

## Atualização do painel administrativo

Antes de publicar esta versão, execute no Supabase SQL Editor o trecho abaixo (ele também está no final de `supabase/schema.sql`):

```sql
alter table public.affiliates
  add column if not exists admin_active boolean not null default true;

create index if not exists affiliates_admin_active_idx on public.affiliates(admin_active);
```

`admin_active` é separado de `active`. Portanto, marcar uma afiliada como INATIVA no painel administrativo não bloqueia o login dela, não altera os links, não interrompe checkout e não interfere no cálculo de comissão.

O painel considera venda apenas pedido pago conforme `isPaidOrder` e, se a afiliada ficar 7 dias sem nenhuma venda paga, marca automaticamente `admin_active=false` na próxima atualização do painel.

A senha atual das afiliadas não é recuperável pelo Supabase Auth. O painel mostra o e-mail e permite ao administrador definir uma nova senha pelo botão de dados de acesso, sem armazenar senha em texto puro.

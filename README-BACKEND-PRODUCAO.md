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
ADMIN_EMAILS=seu-email@dominio.com
```

## 3. Yampi

No painel Yampi, crie um webhook em Configurações → Webhooks.

URL:

```text
https://SEU-DOMINIO/api/webhooks/yampi
```

Ative pelo menos:
- Pedido criado
- Pedido atualizado
- Pedido aprovado
- Status do pedido atualizado

A URL de checkout já usa:

```text
?metadata[affiliate_id]=ID_DA_AFILIADA
```

A Yampi documenta que metadata é salva no pedido e fica disponível por API/webhook.

Configure no webhook a mesma chave usada em `YAMPI_WEBHOOK_SECRET` se a sua configuração de webhook expuser essa chave no header.

## 4. Deploy

Copie para a raiz do projeto:
- `api/`
- `supabase/`
- `.env.example`

O `src/` desta entrega já contém as alterações de frontend.

## Observação

O código está preparado para Vercel Serverless + Supabase e não depende de uma biblioteca adicional de backend. As credenciais da sua conta Supabase/Yampi são a única parte que não pode ser criada por código dentro do ZIP.

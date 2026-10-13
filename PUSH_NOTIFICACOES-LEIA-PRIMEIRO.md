# She Afiliadas — preparação de notificações push

## 1. Supabase
Execute `supabase/migration_affiliate_push_subscriptions.sql` uma vez no SQL Editor. A tabela fica com RLS habilitado e sem políticas para navegador; as rotas do backend usam a service role.

## 2. VAPID
Configure no Vercel (Production) estas variáveis:
- `VAPID_PUBLIC_KEY`: chave pública VAPID em Base64URL.
- `VAPID_PRIVATE_KEY`: chave privada VAPID, segredo exclusivo do backend; nunca colocar no frontend nem no GitHub.
- `VAPID_SUBJECT`: contato, por exemplo `mailto:suporte@shecoisademulher.com`.

A chave pública também é devolvida pela rota autenticada `GET /api/affiliate/push-subscription`. Gere um único par VAPID e mantenha-o estável; trocar o par pode invalidar inscrições já cadastradas.

## 3. Comportamento
O convite aparece somente quando a afiliada está autenticada e abre o painel em modo instalado (inclui `navigator.standalone` no iOS), e somente enquanto a permissão estiver em `default`. A inscrição fica vinculada à afiliada no Supabase. A tabela não possui políticas públicas e só é acessada pelo backend.

O service worker exibe notificações recebidas e abre `/afiliado` quando a pessoa toca nelas.

## 4. Limite desta etapa
Esta etapa implementa o convite, o pedido de permissão, o registro seguro das inscrições e o recebimento/exibição pelo service worker. Os envios reais do servidor (por exemplo, ao atingir classificação, venda ou saque) devem ser ligados aos eventos de negócio na próxima etapa. Não envie mensagens até validar uma inscrição de teste.

# She — Painéis de tráfego e gestão do negócio

## Painéis e roteamento
- `/admin/trafego-pago`: campanhas e métricas da Meta Ads.
- `/admin/negocio`: DRE gerencial, parâmetros percentuais, lançamentos manuais e vendas globais da Yampi.
- A sincronização financeira usa a rota já existente `/api/business-analytics?view=sync-yampi` dentro do roteador `api/[...path].js`. Não foi criado nenhum novo arquivo de endpoint em `api/`, para preservar o limite de Serverless Functions da Vercel.

## Banco de dados — obrigatório antes de usar o painel
Execute o arquivo completo `supabase/migration_business_analytics.sql` no SQL Editor do Supabase. Além do razão financeiro, ele cria:
- `she_business_orders`: cópia financeira independente de todos os pedidos da Yampi, com chave única por ID de pedido.
- `she_business_sync_state`: cursor persistente da importação por lotes.

As duas tabelas novas têm RLS habilitado e são acessadas pelo backend com a service role, após validar a sessão de administrador.

## Sincronizar pedidos Yampi
1. Confirme na Vercel as variáveis existentes `YAMPI_USER_TOKEN` e `YAMPI_USER_SECRET_KEY` (e `YAMPI_ALIAS` se a loja precisar dele).
2. Publique o projeto depois de executar a migração SQL.
3. Abra `/admin/negocio` e clique em **Sincronizar Yampi**.
4. Se o painel informar que o histórico continua em andamento, clique novamente em **Continuar sincronização Yampi** até indicar ciclo completo. Cada chamada processa um lote limitado de páginas para respeitar o tempo máximo da função Vercel.
5. Os IDs são únicos e os pedidos são atualizados por upsert, portanto repetir lotes não duplica faturamento.

A importação financeira não chama `syncAffiliateOrders`, não grava em `affiliate_orders`, não recalcula comissões e não envia notificações para afiliadas. A lógica existente de afiliadas permanece separada. O ID de afiliada, quando encontrado nos metadados, é guardado apenas como informação opcional no registro financeiro; pedidos sem afiliada também são importados.

A importação percorre o histórico retornado pela API da Yampi usando scroll. Depois de um ciclo completo, a próxima sincronização inicia uma nova passagem para atualizar pedidos/status mais recentes. O cursor é salvo por página para que chamadas sucessivas possam continuar a importação histórica.

## Meta Ads
Configure na Vercel `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID` (com ou sem prefixo `act_`) e opcionalmente `META_GRAPH_VERSION`. O token precisa ter permissão de leitura de anúncios/insights para a conta correta. Nunca use variáveis `VITE_` para tokens.

## Observações financeiras
- A receita atribuída pela Meta é exibida separadamente e nunca é somada ao faturamento global da Yampi.
- O painel considera pedidos com pagamento aprovado; cancelamentos/estornos são exibidos como dedução quando o payload da Yampi identifica que houve pagamento.
- Impostos e taxas percentuais são estimativas gerenciais. O CMV, frete, comissões e outros custos variáveis ainda precisam ser cadastrados/mapeados para que o resultado represente a margem real.
- Compare um mês fechado com o relatório da Yampi antes de usar os números para decisões contábeis.

# SHE — Guia permanente de integração de carrinhos (leia antes de alterar páginas)

Este arquivo é documentação operacional para futuras manutenções do projeto. Quando receber uma nova cópia do projeto, leia este documento antes de modificar carrinhos, páginas de produto, checkout ou rastreamento de afiliadas.

## Arquitetura atual

- O painel de produtos está em `src/pages/AdminProducts.jsx`, acessível em `/admin/produtos` e pelo menu do Admin.
- As APIs administrativas estão em `api/_handlers/admin_products.js` e na rota `api/admin/products.js`. Todas as operações administrativas exigem a sessão `requireAdmin`.
- A leitura pública de configuração de carrinho está em `api/_handlers/cart_config.js`, rota `/api/cart-config?slug=<slug>`. Ela consulta `she_cart_pages`, `she_cart_page_products` e `she_cart_products` e resolve os preços via `api/_lib/cartPrices.js` sem expor credenciais Yampi.
- O carrinho reutilizável está em `src/components/DynamicSheCart.jsx`. Ele recebe `pageSlug`, lê a configuração, exibe produtos principais e upsells e usa `buildYampiCheckoutUrl`.
- Os carrinhos das páginas atuais foram conectados assim: `src/pages/Hidratante.jsx` usa `pageSlug="hidratante"`; `src/pages/Stick.jsx` usa `pageSlug="stick"`.
- Os tokens de checkout/SKU Yampi ficam em `she_cart_products.yampi_token`. Não confundir com UUID interno da linha, ID numérico de catálogo ou ID de afiliada.
- A atribuição de afiliada deve continuar sendo feita por `buildYampiCheckoutUrl` em `src/utils/affiliateTracking.js`, que acrescenta `metadata[affiliate_id]`. Não substituir por URL de checkout criada manualmente nem remover os parâmetros de afiliada.
- O endpoint de preço pode receber tokens dinâmicos válidos; a busca real permanece no backend `api/_lib/cartPrices.js` usando credenciais de servidor.

## Como conectar uma nova página de vendas no futuro (manual; NÃO automatizado)

Quando uma nova landing page for desenvolvida, siga todos estes passos:

1. **Leia os arquivos existentes antes de editar.** Compare `src/pages/Hidratante.jsx`, `src/pages/Stick.jsx`, `src/components/DynamicSheCart.jsx`, `src/utils/affiliateTracking.js`, `api/_handlers/cart_config.js`, `api/_lib/cartPrices.js`, `src/App.jsx` e este guia.
2. **Construa a página de vendas** em um componente próprio, por exemplo `src/pages/SkinClear.jsx`. Não copie nem crie uma nova implementação independente de carrinho, preços ou checkout.
3. **Conecte o carrinho compartilhado** importando `DynamicSheCart` e renderizando `<DynamicSheCart open={cartOpen} onClose={() => setCartOpen(false)} pageSlug="skinclear" affiliateId={affiliateId} onPricesUpdated={updateNavbarProductPrice} />`. Adapte os nomes de estado e callbacks à página, sem mudar a lógica de atribuição de afiliada.
4. **Registre a rota pública** em `src/App.jsx`, tanto a rota sem afiliada (ex.: `/skinclear`) quanto a rota de afiliada (ex.: `/:affiliateSlug/skinclear`). A rota de afiliada deve passar `affiliateId` obtido por `AffiliateGuard`, como já ocorre com Hidratante e Stick. Não altere a rota genérica `/:affiliateSlug` sem verificar colisões.
5. **Registre a página no banco** pela tela `/admin/produtos` usando “Registrar página”, com o nome e slug exatamente iguais à rota (sem barras). Isso cria a linha em `she_cart_pages`. A tela não gera nem altera o código da landing page.
6. **Cadastre/valide os produtos** em `/admin/produtos`. Use como ID Yampi o token/identificador de checkout que já funciona no mecanismo atual; ao salvar, a API tenta consultar o preço. Se o preço não for encontrado, não publique a página até corrigir o token.
7. **Configure o carrinho** selecionando a nova página e marcando os produtos como “Principal” e/ou “Upsell”; clique em “Salvar carrinho”. A ordem de exibição acompanha a ordem dos produtos no painel (posição gravada no mapeamento).
8. **Teste sem afiliada e com afiliada.** Teste a página sem prefixo e a rota `/:affiliateSlug/<slug>`. Monte carrinho com apenas principal, principal + upsell e quantidades diferentes. Confirme os tokens e quantidades na URL Yampi, a presença de `metadata[affiliate_id]` no checkout de afiliada e a atribuição no webhook/sincronização Yampi.
9. **Não altere as regras de comissão para resolver problemas de checkout.** A atribuição e cálculo de comissão vivem no sistema de afiliadas e no webhook/sincronização. Se uma venda não for atribuída, investigue `buildYampiCheckoutUrl`, metadata, `api/_handlers/webhook_yampi.js`, `api/_lib/yampi.js` e `api/_handlers/affiliate_yampi_sync.js` antes de mexer em comissões.
10. **Não invente automatismo:** cadastrar uma página no painel não conecta o componente React, não registra rotas e não cria uma landing page. Essas etapas são intencionalmente manuais e devem ser feitas pelo desenvolvedor.

## Produtos iniciais e configuração esperada

Tokens atuais de checkout:

- Hidratante: `EFH0YOIDTO`
- Blister: `7B6B7IL4ZM`
- Stick (principal): `GVVB8UXHJ8`
- Hidratante +1: `6G99ZYJTDE`
- Stick +1: `IWK5ZWCEUO`
- Pocket Size: `ORM1LRMTT5`

Configuração inicial:

- `hidratante`: principais Hidratante e Blister; upsells Hidratante +1, Stick e Pocket Size.
- `stick`: principal Stick; upsells Hidratante +1, Stick +1, Blister e Pocket Size.

## Supabase / implantação

- Execute `supabase/migration_dynamic_cart_products.sql` no SQL Editor do projeto Supabase antes do deploy. A migration cria tabelas, RLS, bucket de imagens WebP e dados iniciais idempotentes.
- O backend requer as variáveis já utilizadas pelo projeto: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, além das variáveis existentes da integração Yampi. Nunca coloque service role key ou tokens secretos no frontend.
- O upload WebP usa o bucket público `she-product-images`, com limite de 4 MB. O endpoint administrativo valida sessão antes do upload.
- Após migration e deploy, acesse `/admin/produtos`, salve/valide os produtos e teste preços/carrinho. A configuração do banco não altera por si só os arquivos da landing page.

## Observações importantes

- Produto principal versus upsell é apenas a disposição visual. O checkout continua enviando `TOKEN:QUANTIDADE` no mesmo formato da Yampi.
- Não trocar o token de checkout por UUID interno da tabela.
- Não remover `metadata[affiliate_id]` nem alterar `buildYampiCheckoutUrl` sem teste completo de atribuição.
- Não voltar a hardcodar listas de produtos em cada página; novas páginas devem usar `DynamicSheCart`.
- Se a API retornar preço ausente, erro de consulta ou configuração não encontrada, mostrar erro e não simular preço.

# Dados do administrador — configuração

A seção **Dados** do painel administrativo permite consultar/alterar o login e o e-mail de login, gerenciar até 20 e-mails de notificação e trocar a senha do administrador. A senha atual nunca é exibida em texto: somente seu hash é armazenado.

## Aplicar no Supabase

Antes de testar o novo painel, abra o SQL Editor do Supabase e execute `supabase/migration_admin_profile_settings.sql`. A migration cria a tabela privada `admin_profile_settings`, com RLS habilitado e acesso restrito ao backend usando `service_role`.

## Publicar

Suba o projeto atualizado ao GitHub e espere o deploy da Vercel ficar `Ready`. Não são necessárias novas variáveis de ambiente. Inicialmente, login, e-mail e destinatários são lidos das variáveis `ADMIN_USERNAME` (se houver), `ADMIN_LOGIN`, `ADMIN_EMAIL` e `ADMIN_EMAILS`; depois que os dados forem salvos pela seção Dados, a configuração gravada no Supabase passa a ser a fonte principal.

## Uso e segurança

- Como as operações já exigem uma sessão administrativa autenticada, não é necessário informar a senha atual novamente para alterar o login ou o e-mail. Para trocar a senha, informe a nova senha e confirme-a.
- A nova senha precisa ter pelo menos 10 caracteres.
- Se não houver e-mails salvos na tabela, a interface e os avisos administrativos usam `ADMIN_EMAILS` como lista inicial/fallback. Assim, endereços já configurados como `adm@shecoisademulher.com` voltam a aparecer quando a lista salva estiver vazia.
- Para salvar apenas os e-mails de notificação, deixe a nova senha em branco.
- Os e-mails cadastrados serão usados nos avisos administrativos existentes, como novas solicitações de saque e vídeos para análise.
- Não há endpoint público de leitura da tabela; as consultas e gravações são feitas no backend autenticado.

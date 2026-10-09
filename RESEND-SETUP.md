# Configuração do Resend no Vercel

Configure estas variáveis no projeto da She:

```text
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=She Afiliadas <noreply@seu-dominio.com>
ADMIN_EMAILS=seu-email@dominio.com
SITE_URL=https://seu-dominio.com
```

`RESEND_API_KEY` fica somente no backend/Vercel.

`EMAIL_FROM` deve ser um remetente/domínio autorizado no Resend.

`ADMIN_EMAILS` aceita vários e-mails separados por vírgula.

## Fluxos

Administrador recebe:
- nova solicitação de saque;
- novo vídeo para análise.

Afiliada recebe:
- nova afiliada efetivada por Impulsionar Equipe;
- saque aprovado/pago;
- recuperação de senha.

Não há notificações de vendas por e-mail.

## Recuperação de senha

A afiliada clica em `Esqueceu sua senha?`, informa o e-mail cadastrado e recebe um link do próprio domínio da She.

O token é aleatório, salvo apenas em hash no Supabase, expira em 30 minutos e é invalidado após a troca da senha.

## Templates de boas-vindas e análise de vídeo

Os templates de e-mail ficam definidos no código em `api/_lib/email.js`; não é necessário cadastrar modelos separados no painel do Resend. O backend envia o HTML diretamente pela API HTTP do Resend.

- **Boas-vindas:** disparado após o cadastro da afiliada ser concluído com sucesso.
- **Vídeo aprovado/recusado:** disparado quando o administrador altera o status de uma solicitação de vídeo. Na recusa, a observação do administrador é incluída na mensagem.

A configuração já existente continua necessária: `RESEND_API_KEY`, `EMAIL_FROM` (remetente/domínio verificado no Resend) e `SITE_URL` para compor o link do painel. Se os e-mails atuais já estão enviando corretamente, em princípio nenhuma alteração no painel do Resend é necessária.

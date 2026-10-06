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

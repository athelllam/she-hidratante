# Templates / e-mails transacionais da She

O sistema usa a API do Resend. Não há notificações de vendas por e-mail.

## Afiliada

**Redefinição de senha**
- Assunto: `Redefina sua senha — She Afiliadas`
- Destinatária: e-mail cadastrado da afiliada.
- Link: `https://SEU-DOMINIO/afiliado/redefinir-senha/<TOKEN>`
- Token de uso único, válido por 30 minutos.

**Nova afiliada por Impulsionar Equipe**
- Assunto: `Nova afiliada entrou na sua equipe — NOME`
- Destinatária: e-mail da afiliada mãe.

**Saque aprovado/pago**
- Assunto: `Saque aprovado — She Afiliadas` ou `Saque pago — She Afiliadas`
- Destinatária: e-mail da afiliada.

## Administrador

**Nova solicitação de saque**
- Assunto: `Nova solicitação de saque — NOME`
- Destinatários: todos os endereços em `ADMIN_EMAILS`.

**Novo vídeo para análise**
- Assunto: `Novo vídeo para análise — NOME`
- Destinatários: todos os endereços em `ADMIN_EMAILS`.

As mensagens são enviadas diretamente pela API HTTP do Resend. O backend não expõe `RESEND_API_KEY` ao frontend.

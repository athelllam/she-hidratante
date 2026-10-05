# Templates WhatsApp — She Afiliadas

Use `pt_BR` e categoria `UTILITY`. O número remetente é o WhatsApp Business da She.

## 1. she_password_reset

**Corpo:**

Olá, {{1}}! Recebemos uma solicitação para redefinir a senha da sua conta de afiliada She. Este link é válido por 30 minutos.

**Botão:** URL — `Redefinir senha`

**URL base:** `https://shecoisademulher.com/afiliado/redefinir-senha/`

O sistema envia o token como sufixo dinâmico.

## 2. she_admin_withdrawal

**Corpo:**

💰 Nova solicitação de saque.

Afiliada: {{1}}
Valor: {{2}}
Origem: {{3}}
PIX: {{4}}

**Destinatário:** número administrativo do responsável.

## 3. she_admin_video

**Corpo:**

🎬 Novo vídeo para análise.

Afiliada: {{1}}
Solicitação: {{2}}
Link: {{3}}

**Destinatário:** número administrativo do responsável.

## 4. she_team_boost_join

**Corpo:**

🎉 Olá, {{1}}! A afiliada {{2}} entrou na sua equipe por meio do Impulsionar Equipe. A entrada foi efetivada e já foi contabilizada no sistema.

**Destinatário:** WhatsApp da afiliada mãe.

## 5. she_withdrawal_approved

**Corpo:**

✅ Olá, {{1}}! Seu saque de {{2}} foi aprovado. O valor será processado conforme os dados informados no seu cadastro.

**Destinatário:** WhatsApp da afiliada.

## Matriz final de notificações

| Evento | Destinatário |
|---|---|
| Esqueceu sua senha | Afiliada |
| Nova afiliada por Impulsionar Equipe | Afiliada mãe |
| Saque aprovado | Afiliada que solicitou |
| Nova solicitação de saque | Admin |
| Novo vídeo enviado | Admin |

Não são enviados alertas de venda por WhatsApp para afiliadas ou para a equipe.

ATUALIZACAO DE SEGURANCA - WEBHOOK WOOVI

Arquivos principais alterados:
- api/webhooks/yampi.js
- api/_handlers/webhook_woovi.js
- WOOVI-SETUP.md

O que muda:
- Preserva os bytes originais do corpo HTTP no entrypoint compartilhado de webhook.
- Continua encaminhando provider=woovi para o handler Woovi sem criar outra serverless function.
- Valida x-webhook-signature (RSA-SHA256) usando as chaves publicas oficiais da Woovi antes de gravar eventos no Supabase.
- Continua exigindo x-she-webhook-token como camada adicional.
- Mantem o processamento Yampi no mesmo entrypoint; para Yampi, o corpo JSON continua sendo parseado.

Como publicar:
1. Atualize no GitHub os arquivos api/webhooks/yampi.js e api/_handlers/webhook_woovi.js com as versoes deste pacote.
2. Mantenha a URL cadastrada em todos os webhooks como https://she-hidratante.vercel.app/api/webhooks/woovi (sem token na URL).
3. No cadastro de cada webhook na Woovi, mantenha o header x-she-webhook-token igual a WOOVI_WEBHOOK_TOKEN na Vercel.
4. Como o segredo anterior apareceu em capturas, gere um novo WOOVI_WEBHOOK_TOKEN, atualize-o na Vercel e nos tres webhooks e faça redeploy.
5. Verifique nos logs que as notificacoes assinadas retornam HTTP 200 e que chamadas sem x-webhook-signature valido retornam HTTP 401.
6. Nao aprove saques reais ate confirmar com a Woovi que Pix Out e autoApprove estao liberados para essa conta e concluir um teste controlado.

Validacoes realizadas antes da entrega:
- node --check api/webhooks/yampi.js
- node --check api/_handlers/webhook_woovi.js

Ainda nao foi feito um teste real no deploy do usuario nem uma transferencia Pix.

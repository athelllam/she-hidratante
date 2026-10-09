# Correção da rota Dados do administrador

O erro HTTP 404 `NOT_FOUND` indica que a chamada a `/api/admin/data` não está sendo roteada para uma função de API no deploy. Para evitar criar uma 13ª função serverless, esta correção reescreve `/api/admin/data` para a função existente `/api/admin/affiliates` e encaminha internamente para `api/_handlers/admin_data.js`.

## Aplicação
1. Substitua `vercel.json` na raiz do repositório.
2. Substitua `api/admin/affiliates.js` pelo arquivo deste pacote, mantendo o mesmo caminho.
3. Faça commit e aguarde o deploy da Vercel ficar **Ready**.
4. Reabra o painel admin e clique em **Dados**.

Não é necessário alterar o Supabase nem executar SQL adicional para corrigir o 404. Esta correção reutiliza uma função existente e não adiciona novo arquivo de rota.

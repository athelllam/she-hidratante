# She Afiliadas Android — status da entrega

## Implementado no código web
- Detecta Android e direciona o botão **Baixar App** para `/she-afiliadas.apk`.
- Em iPhone/iPad, navegadores diferentes do Safari mostram o aviso **“É necessário baixar pelo Safari”**.
- No Safari do iOS, o botão abre o tutorial de instalação iOS existente.
- O tutorial não é acionado no Android; a WebView nativa abre com `source=android-app` e não mostra o botão de baixar dentro do próprio app.

## Atenção antes de publicar
Este ZIP contém o projeto-fonte Android, não um APK pronto. O ambiente usado para preparar os arquivos não tem Android SDK/Gradle configurados para compilar o APK. O arquivo `she-afiliadas.apk` também precisa existir em `public/` para que o botão de download funcione; não publique a alteração web antes de disponibilizar o APK nesse caminho.

## Push Android
O Android usa Firebase Cloud Messaging (FCM), que é diferente do Web Push VAPID usado pelo PWA do iPhone. O esqueleto Android inclui a recepção nativa de notificações e captura do token, mas a associação do token à afiliada autenticada e o envio pelo backend ainda precisam ser integrados e configurados com o projeto Firebase. Não é seguro afirmar que o push Android já está funcional neste estado.

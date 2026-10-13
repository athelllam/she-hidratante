# She Afiliadas para Android (WebView + Firebase Cloud Messaging)

Este projeto Android Studio cria um app nativo chamado **She Afiliadas** que abre o site em uma WebView. Ele não é um APK compilado.

## Antes de compilar
1. O projeto Firebase `she-afiliadas` e o app Android `br.com.sheafiliadas.app` já foram registrados.
2. O arquivo `google-services.json` deste projeto já está incluído em `android-app/app/google-services.json`.
3. Abra a pasta `android-app` no Android Studio e sincronize o Gradle.
4. Compile um APK de teste. O push ainda exige integração do token FCM ao cadastro de dispositivos/afiliadas e adaptação do emissor backend.

## Estado das notificações
A base do Firebase Cloud Messaging e o serviço que exibe notificações estão incluídos, e o app recupera/guarda o token FCM. **O push Android ainda não está integrado ao backend de produção**: para ficar equivalente ao push iOS, é preciso cadastrar os tokens FCM associados à afiliada autenticada no Supabase e adaptar o emissor existente para enviar a esses tokens usando credenciais de servidor do Firebase. Não coloque credenciais privadas do Firebase no app nem no GitHub.

## URL inicial
A atividade abre diretamente `https://she-hidratante.vercel.app/afiliado` dentro de uma WebView. A base do Firebase Messaging e a solicitação de permissão para notificações Android permanecem no projeto. O token FCM ainda precisa ser associado à afiliada autenticada no backend e o emissor backend precisa enviar para tokens FCM; a simples compilação não completa essa integração.

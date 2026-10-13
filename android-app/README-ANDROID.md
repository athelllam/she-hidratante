# She Afiliadas para Android

## Correções incluídas
- URL inicial definida para `https://she-hidratante.vercel.app/afiliado` em `app/src/main/java/br/com/sheafiliadas/app/MainActivity.java`.
- Ícone de launcher configurado usando `@mipmap/ic_launcher` e `@mipmap/ic_launcher_round`, com os PNGs nas densidades Android.

## Gerar o APK atualizado
Abra `android-app` no Android Studio, sincronize o Gradle e gere um APK em **Build > Build Bundle(s) / APK(s) > Build APK(s)**. Copie o APK gerado para `public/she-afiliadas.apk` antes de publicar o site na Vercel.

O APK antigo foi removido da pasta `public` para evitar continuar distribuindo a versão que abre o endereço errado. O ambiente usado para preparar este ZIP não conseguiu baixar a distribuição do Gradle, portanto não foi possível compilar um novo APK aqui.

## Aviso do Android
O alerta do Play Protect pode aparecer em APKs instalados fora da Play Store, especialmente builds de teste/debug. Para distribuição pública mais confiável, gere um APK **release assinado** com uma chave de assinatura mantida em segurança. Isso não garante que o Play Protect nunca mostre um aviso; a distribuição pela Play Store é a opção recomendada.

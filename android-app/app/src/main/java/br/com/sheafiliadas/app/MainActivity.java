package br.com.sheafiliadas.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.net.Uri;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.google.firebase.messaging.FirebaseMessaging;

public class MainActivity extends ComponentActivity {
    private static final String HOME_URL = "https://she-hidratante.vercel.app/afiliado";
    private WebView webView;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        createNotificationChannel();
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 501);
        }
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            // Alguns redirecionamentos/canonical URLs levam ao domínio principal da She.
            // No app de afiliadas, sempre voltamos para a área de afiliadas no Vercel.
            private boolean redirectMainSiteToAffiliate(String url) {
                if (url == null) return false;
                Uri uri = Uri.parse(url);
                String host = uri.getHost();
                if (host == null) return false;
                host = host.toLowerCase(java.util.Locale.ROOT);
                if (host.equals("shecoisademulher.com") || host.equals("www.shecoisademulher.com")) {
                    webView.post(() -> webView.loadUrl(HOME_URL));
                    return true;
                }
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return redirectMainSiteToAffiliate(request.getUrl().toString());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return redirectMainSiteToAffiliate(url);
            }
        });
        webView.loadUrl(HOME_URL);
        // Token retrieval is enabled in the native shell. The backend must associate it with
        // the authenticated affiliate and send FCM messages before Android push is production-ready.
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) return;
            String token = task.getResult();
            getSharedPreferences("she_push", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
        });
    }
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("she_affiliadas", "She Afiliadas", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Avisos de vendas, comissões e equipe");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}

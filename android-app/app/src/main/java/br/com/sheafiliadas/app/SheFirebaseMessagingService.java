package br.com.sheafiliadas.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class SheFirebaseMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token) {
        getSharedPreferences("she_push", MODE_PRIVATE).edit().putString("fcm_token", token).apply();
        // Token rotation must be synced to the authenticated affiliate by the app/backend bridge.
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        String title = message.getNotification() != null && message.getNotification().getTitle() != null ? message.getNotification().getTitle() : "She Afiliadas";
        String body = message.getNotification() != null && message.getNotification().getBody() != null ? message.getNotification().getBody() : "Você tem uma nova atualização.";
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0));
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, "she_affiliadas")
                .setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setContentIntent(pending).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_DEFAULT);
        ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).notify((int) System.currentTimeMillis(), notification.build());
    }
}

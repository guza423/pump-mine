package app.performance.training;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

// V32 · Unutulan antrenman bildirimleri ("Hâlâ orada mısın?" ve "bitirildi"). Kaydı JS bitirir.
public class IdleReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences(RestTimerPlugin.IDLE_PREFS, Context.MODE_PRIVATE);
        String kind = intent.getStringExtra("kind");
        long stamp = intent.getLongExtra("stamp", -1);
        boolean ask = "ask".equals(kind);
        // Yeniden kurulan ya da durdurulan bekçinin eski alarmı bildirim çıkarmasın.
        if (stamp <= 0 || prefs.getLong(ask ? "askAt" : "endAt", 0) != stamp) return;
        RestTimerPlugin.createIdleChannel(context, null);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (!ask) manager.cancel(RestTimerPlugin.IDLE_ASK_ID);
        Notification.Builder notification = RestTimerPlugin.builder(context, RestTimerPlugin.IDLE_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_rest)
            .setContentTitle(intent.getStringExtra("title"))
            .setContentText(intent.getStringExtra("body"))
            .setStyle(new Notification.BigTextStyle().bigText(intent.getStringExtra("body")))
            .setAutoCancel(true).setPriority(Notification.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(RestTimerPlugin.openApp(context));
        if (Build.VERSION.SDK_INT < 26) notification.setSound(RestTimerPlugin.pixelSound(context)).setVibrate(RestTimerPlugin.IDLE_VIBRATION);
        try { manager.notify(ask ? RestTimerPlugin.IDLE_ASK_ID : RestTimerPlugin.IDLE_END_ID, notification.build()); }
        catch (SecurityException denied) { /* bildirim izni yoksa uygulama içi uyarı yeter */ }
    }
}

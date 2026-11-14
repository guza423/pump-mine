package app.performance.training;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class RestTimerReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        SharedPreferences prefs = context.getSharedPreferences(RestTimerPlugin.PREFS, Context.MODE_PRIVATE);
        long endAt = intent.getLongExtra("endAt", -1);
        // İptal edilmiş/eski alarm, yeni sayacı bitirmesin.
        if (endAt <= 0 || prefs.getLong("endAt", 0) != endAt) return;
        prefs.edit().clear().commit();
        RestTimerPlugin.createChannels(context);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        manager.cancel(RestTimerPlugin.RUNNING_ID);
        Notification.Builder notification = RestTimerPlugin.builder(context, RestTimerPlugin.DONE_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_rest)
            .setContentTitle(intent.getStringExtra("doneTitle"))
            .setContentText(intent.getStringExtra("doneBody"))
            .setAutoCancel(true).setPriority(Notification.PRIORITY_HIGH)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(RestTimerPlugin.openApp(context));
        if (Build.VERSION.SDK_INT >= 26) notification.setTimeoutAfter(5 * 60 * 1000);
        else notification.setDefaults(Notification.DEFAULT_SOUND).setVibrate(RestTimerPlugin.VIBRATION);
        try { manager.notify(RestTimerPlugin.DONE_ID, notification.build()); }
        catch (SecurityException denied) { /* İzin kaldırılmışsa ekrandaki sayaç çalışmaya devam eder. */ }
    }
}

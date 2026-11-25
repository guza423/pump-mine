package app.performance.training;

import android.app.Notification;
import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONObject;

// V33 · Plan hatırlatması: planlı günden bir gün önce 20:00. Liste değiştiyse eski alarm bildirim çıkarmaz.
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        long stamp = intent.getLongExtra("stamp", -1);
        int slot = intent.getIntExtra("slot", -1);
        try {
            String raw = context.getSharedPreferences(RestTimerPlugin.REMIND_PREFS, Context.MODE_PRIVATE).getString("items", "[]");
            JSONArray items = new JSONArray(raw);
            JSONObject it = slot >= 0 && slot < items.length() ? items.optJSONObject(slot) : null;
            if (it == null || it.optLong("at", 0) != stamp) return;
        } catch (Exception error) { return; }
        RestTimerPlugin.createRemindChannel(context, null);
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        Notification.Builder notification = RestTimerPlugin.builder(context, RestTimerPlugin.REMIND_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_rest)
            .setContentTitle(intent.getStringExtra("title"))
            .setContentText(intent.getStringExtra("body"))
            .setStyle(new Notification.BigTextStyle().bigText(intent.getStringExtra("body")))
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(RestTimerPlugin.openApp(context));
        if (android.os.Build.VERSION.SDK_INT < 26) notification.setSound(RestTimerPlugin.pixelSound(context));
        try { manager.notify(RestTimerPlugin.REMIND_BASE + Math.max(0, slot), notification.build()); }
        catch (SecurityException denied) { /* bildirim izni yok */ }
    }
}

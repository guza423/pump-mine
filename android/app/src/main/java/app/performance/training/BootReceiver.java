package app.performance.training;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;

// V33 · Telefon yeniden açılınca alarmlar silinir: saklanan plan hatırlatmaları yeniden kurulur.
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) && !"android.intent.action.MY_PACKAGE_REPLACED".equals(action)) return;
        try {
            String raw = context.getSharedPreferences(RestTimerPlugin.REMIND_PREFS, Context.MODE_PRIVATE).getString("items", "[]");
            RestTimerPlugin.scheduleReminders(context, new JSONArray(raw));
        } catch (Exception error) { /* liste bozuksa uygulama açılınca yeniden yazılır */ }
    }
}

package app.performance.training;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;

// V37 · İdmanda telefonu bırak.
// 1) Geri dön: süren idmanda uygulamadan çıkılınca ya da ekran kapanınca 2 dk sonra uygulama kendiliğinden yeniden
//    açılır (ekranı yakar, kilit ekranının üstünde), her 2 dk'da bir, uygulama öne gelene dek. Arka plandan açmak için
//    Android "Diğer uygulamaların üzerinde göster" izni ister; izin yoksa her 2 dk'da sesli "İdmana dön" bildirimi.
// 2) Bitirmeyi unutma: idman 40 dk'yı geçince uygulamaya 3 dk dokunulmazsa telefon titrer; dokunulmadıkça her 3 dk'da.
// Dokunuşu MainActivity.dispatchTouchEvent bildirir. Unutulan idman bekçisi (V32) 15 dk'da kaydı kapatır; kendiliğinden
// açılış giriş sayılmaz (JS focusResume ile sorar). Güvenlik: son dokunuştan 25 dk sonra bekçi kendini durdurur.
final class FocusGuard {
    static final String PREFS = "focus-guard";
    static final long BACK_MS = 2 * 60 * 1000L;
    static final long END_AFTER_MS = 40 * 60 * 1000L;
    static final long BUZZ_MS = 3 * 60 * 1000L;
    static final long CAP_MS = 25 * 60 * 1000L;
    static final long TOUCH_EVERY_MS = 5000L;
    static final int BACK_ID = 4110;
    static final int BUZZ_ID = 4111;
    static final String BACK_CHANNEL = "workout-back-px";
    static final String BUZZ_CHANNEL = "workout-end-buzz";
    static final String EXTRA_BACK = "outmove.focusBack";
    static final long[] BACK_VIBRATION = { 0, 250, 120, 250 };
    static final long[] BUZZ_VIBRATION = { 0, 600, 250, 600, 250, 600 };

    private FocusGuard() {}

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static boolean overlayNeeded() { return Build.VERSION.SDK_INT >= 29; }

    static boolean overlayAllowed(Context c) {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c);
    }

    // JS süren idmanı bildirir (başlarken, ayar/dil değişince, öne gelince).
    static void set(Context c, String sid, long startedAt, long lastInput, boolean back, boolean end,
                    String backTitle, String backBody, String endTitle, String endBody, String backCh, String endCh) {
        SharedPreferences p = prefs(c);
        long now = System.currentTimeMillis();
        boolean same = p.getBoolean("on", false) && sid.equals(p.getString("sid", ""));
        long last = Math.max(startedAt, lastInput > 0 ? lastInput : now);
        if (same) last = Math.max(last, p.getLong("lastTouch", 0));
        p.edit().putBoolean("on", true).putString("sid", sid).putLong("startedAt", startedAt).putLong("lastTouch", last)
            .putBoolean("back", back).putBoolean("end", end).putBoolean("fg", same ? p.getBoolean("fg", true) : true)
            .putString("backTitle", backTitle).putString("backBody", backBody)
            .putString("endTitle", endTitle).putString("endBody", endBody).commit();
        createChannels(c, backCh, endCh);
        if (!back) cancelBack(c);
        scheduleBuzz(c);
    }

    static void stop(Context c) {
        prefs(c).edit().clear().commit();
        AlarmManager alarms = c.getSystemService(AlarmManager.class);
        alarms.cancel(pending(c, BACK_ID, "back", 0));
        alarms.cancel(pending(c, BUZZ_ID, "buzz", 0));
        NotificationManager m = c.getSystemService(NotificationManager.class);
        m.cancel(BACK_ID);
        m.cancel(BUZZ_ID);
    }

    // Gerçek dokunuş: kendiliğinden açılış işareti kalkar, titreşim sayacı baştan başlar.
    static void touch(Context c) {
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("on", false)) return;
        long now = System.currentTimeMillis();
        if (now - p.getLong("lastTouch", 0) < TOUCH_EVERY_MS && !p.getBoolean("auto", false)) return;
        p.edit().putLong("lastTouch", now).putBoolean("auto", false).commit();
        NotificationManager m = c.getSystemService(NotificationManager.class);
        m.cancel(BACK_ID);
        m.cancel(BUZZ_ID);
        scheduleBuzz(c);
    }

    static void foreground(Context c) {
        SharedPreferences p = prefs(c);
        p.edit().putBoolean("fg", true).putLong("backAt", 0).commit();
        c.getSystemService(AlarmManager.class).cancel(pending(c, BACK_ID, "back", 0));
    }

    static void background(Context c) {
        SharedPreferences p = prefs(c);
        p.edit().putBoolean("fg", false).commit();
        if (p.getBoolean("on", false) && p.getBoolean("back", true)) scheduleBack(c, System.currentTimeMillis() + BACK_MS);
    }

    static void markAuto(Context c) {
        if (prefs(c).getBoolean("on", false)) prefs(c).edit().putBoolean("auto", true).commit();
    }

    /** Son öne gelme kendiliğinden açılış mıydı? Okununca silinir. */
    static boolean consumeAuto(Context c) {
        SharedPreferences p = prefs(c);
        boolean auto = p.getBoolean("auto", false);
        if (auto) p.edit().putBoolean("auto", false).commit();
        return auto;
    }

    private static void cancelBack(Context c) {
        prefs(c).edit().putLong("backAt", 0).commit();
        c.getSystemService(AlarmManager.class).cancel(pending(c, BACK_ID, "back", 0));
    }

    private static void scheduleBack(Context c, long at) {
        prefs(c).edit().putLong("backAt", at).commit();
        schedule(c, at, pending(c, BACK_ID, "back", at));
    }

    private static void scheduleBuzz(Context c) {
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("on", false) || !p.getBoolean("end", true)) {
            p.edit().putLong("buzzAt", 0).commit();
            c.getSystemService(AlarmManager.class).cancel(pending(c, BUZZ_ID, "buzz", 0));
            return;
        }
        long at = Math.max(p.getLong("startedAt", 0) + END_AFTER_MS, p.getLong("lastTouch", 0) + BUZZ_MS);
        p.edit().putLong("buzzAt", at).commit();
        schedule(c, at, pending(c, BUZZ_ID, "buzz", at));
    }

    static void fire(Context c, String kind, long stamp) {
        SharedPreferences p = prefs(c);
        if (!p.getBoolean("on", false)) return;
        long now = System.currentTimeMillis();
        if (now - p.getLong("lastTouch", now) > CAP_MS) { stop(c); return; }
        if ("back".equals(kind)) {
            if (stamp != p.getLong("backAt", -1) || p.getBoolean("fg", true) || !p.getBoolean("back", true)) return;
            // Önce bir sonraki tur kurulur; uygulama öne gelirse onStart iptal eder.
            scheduleBack(c, now + BACK_MS);
            boolean opened = false;
            if (overlayAllowed(c)) {
                try {
                    Intent open = new Intent(c, MainActivity.class).putExtra(EXTRA_BACK, true)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                    c.startActivity(open);
                    opened = true;
                } catch (Exception blocked) { /* bildirim yeter */ }
            }
            notifyBack(c, p, opened);
        } else if ("buzz".equals(kind)) {
            if (stamp != p.getLong("buzzAt", -1) || !p.getBoolean("end", true)) return;
            long due = Math.max(p.getLong("startedAt", 0) + END_AFTER_MS, p.getLong("lastTouch", 0) + BUZZ_MS);
            if (now + 5000 >= due) {
                buzz(c, p);
                p.edit().putLong("buzzAt", now + BUZZ_MS).commit();
                schedule(c, now + BUZZ_MS, pending(c, BUZZ_ID, "buzz", now + BUZZ_MS));
            } else {
                scheduleBuzz(c);
            }
        }
    }

    private static void notifyBack(Context c, SharedPreferences p, boolean opened) {
        NotificationManager m = c.getSystemService(NotificationManager.class);
        createChannels(c, null, null);
        Notification.Builder n = RestTimerPlugin.builder(c, BACK_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_rest)
            .setContentTitle(p.getString("backTitle", "Back to your workout"))
            .setContentText(p.getString("backBody", ""))
            .setAutoCancel(true).setPriority(Notification.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(RestTimerPlugin.openApp(c));
        if (Build.VERSION.SDK_INT >= 26) n.setTimeoutAfter(opened ? 30 * 1000L : BACK_MS);
        else n.setSound(RestTimerPlugin.pixelSound(c)).setVibrate(BACK_VIBRATION);
        try { m.notify(BACK_ID, n.build()); } catch (SecurityException denied) { /* bildirim izni yok */ }
    }

    private static void buzz(Context c, SharedPreferences p) {
        if (p.getBoolean("fg", false)) {
            // Uygulama açıkken bildirim çubuğu düşmesin: yalnız titreşim.
            try {
                Vibrator v = c.getSystemService(Vibrator.class);
                if (v != null) {
                    if (Build.VERSION.SDK_INT >= 26) v.vibrate(VibrationEffect.createWaveform(BUZZ_VIBRATION, -1));
                    else v.vibrate(BUZZ_VIBRATION, -1);
                }
            } catch (Exception ignored) { /* titreşim yok */ }
            return;
        }
        createChannels(c, null, null);
        Notification.Builder n = RestTimerPlugin.builder(c, BUZZ_CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_rest)
            .setContentTitle(p.getString("endTitle", "Finished your workout?"))
            .setContentText(p.getString("endBody", ""))
            .setAutoCancel(true).setPriority(Notification.PRIORITY_HIGH)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setContentIntent(RestTimerPlugin.openApp(c));
        if (Build.VERSION.SDK_INT >= 26) n.setTimeoutAfter(BUZZ_MS);
        else n.setVibrate(BUZZ_VIBRATION);
        NotificationManager m = c.getSystemService(NotificationManager.class);
        try { m.notify(BUZZ_ID, n.build()); } catch (SecurityException denied) { /* bildirim izni yok */ }
    }

    static void createChannels(Context c, String backName, String endName) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager m = c.getSystemService(NotificationManager.class);
        NotificationChannel back = m.getNotificationChannel(BACK_CHANNEL);
        if (back == null) {
            back = new NotificationChannel(BACK_CHANNEL, backName != null ? backName : "Back to workout", NotificationManager.IMPORTANCE_HIGH);
            back.setSound(RestTimerPlugin.pixelSound(c), RestTimerPlugin.soundAttrs());
            back.enableVibration(true);
            back.setVibrationPattern(BACK_VIBRATION);
            back.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            m.createNotificationChannel(back);
        } else if (backName != null && !backName.contentEquals(back.getName())) {
            back.setName(backName);
            m.createNotificationChannel(back);
        }
        NotificationChannel end = m.getNotificationChannel(BUZZ_CHANNEL);
        if (end == null) {
            end = new NotificationChannel(BUZZ_CHANNEL, endName != null ? endName : "Finish reminder", NotificationManager.IMPORTANCE_HIGH);
            end.setSound(null, null);
            end.enableVibration(true);
            end.setVibrationPattern(BUZZ_VIBRATION);
            end.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            m.createNotificationChannel(end);
        } else if (endName != null && !endName.contentEquals(end.getName())) {
            end.setName(endName);
            m.createNotificationChannel(end);
        }
    }

    private static PendingIntent pending(Context c, int id, String kind, long stamp) {
        Intent intent = new Intent(c, FocusReceiver.class).putExtra("kind", kind).putExtra("stamp", stamp);
        return PendingIntent.getBroadcast(c, id, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static void schedule(Context c, long at, PendingIntent pi) {
        AlarmManager alarms = c.getSystemService(AlarmManager.class);
        alarms.cancel(pi);
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            try { alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi); return; }
            catch (SecurityException denied) { /* gecikmeli alarma düş */ }
        }
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }
}

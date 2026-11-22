package app.performance.training;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "RestTimer", permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"))
public class RestTimerPlugin extends Plugin {
    static final int RUNNING_ID = 4101;
    static final int DONE_ID = 4102;
    static final String PREFS = "rest-timer";
    static final String RUNNING_CHANNEL = "rest-running";
    static final String DONE_CHANNEL = "rest-done";
    static final long[] VIBRATION = { 0, 350, 150, 350 };

    @Override
    @PluginMethod
    @PermissionCallback
    public void checkPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33) {
            JSObject result = new JSObject();
            result.put("notifications", "granted");
            call.resolve(result);
        } else {
            super.checkPermissions(call);
        }
    }

    static void createChannels(Context context) { createChannels(context, null, null); }

    // Kanal adları uygulama dilinde JS'ten gelir (V22). Ad verilmezse (alarm alıcısı) var olan kanala dokunulmaz;
    // kanal hiç yoksa İngilizce varsayılanla açılır. Aynı kimlikle yeniden oluşturmak yalnızca adı günceller.
    static void createChannels(Context context, String runningName, String doneName) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel existingRunning = manager.getNotificationChannel(RUNNING_CHANNEL);
        if (existingRunning != null && runningName != null && !runningName.contentEquals(existingRunning.getName())) {
            existingRunning.setName(runningName);
            manager.createNotificationChannel(existingRunning);
        }
        NotificationChannel existingDone = manager.getNotificationChannel(DONE_CHANNEL);
        if (existingDone != null && doneName != null && !doneName.contentEquals(existingDone.getName())) {
            existingDone.setName(doneName);
            manager.createNotificationChannel(existingDone);
        }
        if (existingRunning == null) {
            NotificationChannel running = new NotificationChannel(RUNNING_CHANNEL, runningName != null ? runningName : "Rest timer", NotificationManager.IMPORTANCE_LOW);
            running.setSound(null, null);
            running.enableVibration(false);
            running.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(running);
        }
        if (existingDone == null) {
            NotificationChannel done = new NotificationChannel(DONE_CHANNEL, doneName != null ? doneName : "Rest finished", NotificationManager.IMPORTANCE_HIGH);
            done.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
            done.enableVibration(true);
            done.setVibrationPattern(VIBRATION);
            done.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(done);
        }
    }

    static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 4100, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static Notification.Builder builder(Context context, String channel) {
        return Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(context, channel) : new Notification.Builder(context);
    }

    private PendingIntent alarmIntent(Intent intent) {
        return PendingIntent.getBroadcast(getContext(), RUNNING_ID, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    @PluginMethod
    public void start(PluginCall call) {
        Long endAt = call.getLong("endAt");
        if (endAt == null || endAt <= 0) { call.reject("endAt gerekli"); return; }
        try {
            Context context = getContext();
            createChannels(context, call.getString("channelRunning"), call.getString("channelDone"));
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            AlarmManager alarms = context.getSystemService(AlarmManager.class);
            Intent intent = new Intent(context, RestTimerReceiver.class)
                .putExtra("endAt", endAt.longValue())
                .putExtra("doneTitle", call.getString("doneTitle", "Rest finished"))
                .putExtra("doneBody", call.getString("doneBody", ""));
            PendingIntent pending = alarmIntent(intent);
            alarms.cancel(pending);
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putLong("endAt", endAt).commit();
            manager.cancel(DONE_ID);
            Notification notification = builder(context, RUNNING_CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_rest)
                .setContentTitle(call.getString("title", "Rest"))
                .setContentText(call.getString("body", ""))
                .setUsesChronometer(true).setChronometerCountDown(true).setWhen(endAt).setShowWhen(true)
                .setOngoing(true).setOnlyAlertOnce(true).setCategory(Notification.CATEGORY_STOPWATCH)
                .setVisibility(Notification.VISIBILITY_PUBLIC).setContentIntent(openApp(context)).build();
            manager.notify(RUNNING_ID, notification);
            if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
                try { alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pending); }
                catch (SecurityException denied) { alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pending); }
            } else {
                alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, endAt, pending);
            }
            call.resolve();
        } catch (Exception error) { call.reject("Could not start the rest notification", error); }
    }

    // V27: tam zamanlı alarm izni (Android 12+). Android 13+ yeni kurulumda kapalı gelir; kullanıcı
    // Ayarlar › Alarmlar ve hatırlatıcılar'dan açar. Kapalıyken start() gecikmeli alarmla çalışmaya devam eder.
    @PluginMethod
    public void exactAlarm(PluginCall call) {
        boolean needed = Build.VERSION.SDK_INT >= 31;
        boolean allowed = !needed || getContext().getSystemService(AlarmManager.class).canScheduleExactAlarms();
        JSObject result = new JSObject();
        result.put("needed", needed);
        result.put("allowed", allowed);
        call.resolve(result);
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT < 31) { call.resolve(); return; }
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getContext().getPackageName()));
            if (getActivity() != null) getActivity().startActivity(intent);
            else getContext().startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            call.resolve();
        } catch (Exception error) { call.reject("Could not open alarm settings", error); }
    }

    // V32 · Unutulan antrenman: son girişten 10 dk sonra "Hâlâ orada mısın?" (titreşimli), 15 dk sonra "bitirildi".
    // Kaydı JS bitirir (uygulama açılınca/öne gelince); bildirimler uygulama kapalıyken de zamanında çıksın diye alarmla.
    static final int IDLE_ASK_ID = 4105;
    static final int IDLE_END_ID = 4106;
    static final String IDLE_PREFS = "idle-watch";
    static final String IDLE_CHANNEL = "workout-idle";
    static final long[] IDLE_VIBRATION = { 0, 500, 200, 500, 200, 500 };

    static void createIdleChannel(Context context, String name) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        NotificationChannel existing = manager.getNotificationChannel(IDLE_CHANNEL);
        if (existing != null) {
            if (name != null && !name.contentEquals(existing.getName())) { existing.setName(name); manager.createNotificationChannel(existing); }
            return;
        }
        NotificationChannel idle = new NotificationChannel(IDLE_CHANNEL, name != null ? name : "Workout check", NotificationManager.IMPORTANCE_HIGH);
        idle.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
            new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
        idle.enableVibration(true);
        idle.setVibrationPattern(IDLE_VIBRATION);
        idle.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(idle);
    }

    private void scheduleIdle(AlarmManager alarms, long at, PendingIntent pending) {
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            try { alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending); return; }
            catch (SecurityException denied) { /* gecikmeli alarma düş */ }
        }
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
    }

    static PendingIntent idlePending(Context context, int id, Intent intent) {
        return PendingIntent.getBroadcast(context, id, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    @PluginMethod
    public void idleArm(PluginCall call) {
        Long askAt = call.getLong("askAt");
        Long endAt = call.getLong("endAt");
        if (askAt == null || endAt == null || askAt <= 0 || endAt <= askAt) { call.reject("askAt ve endAt gerekli"); return; }
        try {
            Context context = getContext();
            createIdleChannel(context, call.getString("channel"));
            AlarmManager alarms = context.getSystemService(AlarmManager.class);
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            manager.cancel(IDLE_ASK_ID);
            manager.cancel(IDLE_END_ID);
            context.getSharedPreferences(IDLE_PREFS, Context.MODE_PRIVATE).edit().putLong("askAt", askAt).putLong("endAt", endAt).commit();
            Intent ask = new Intent(context, IdleReceiver.class).putExtra("kind", "ask").putExtra("stamp", askAt.longValue())
                .putExtra("title", call.getString("askTitle", "Still there?")).putExtra("body", call.getString("askBody", ""));
            Intent end = new Intent(context, IdleReceiver.class).putExtra("kind", "end").putExtra("stamp", endAt.longValue())
                .putExtra("title", call.getString("endTitle", "Workout ended")).putExtra("body", call.getString("endBody", ""));
            scheduleIdle(alarms, askAt, idlePending(context, IDLE_ASK_ID, ask));
            scheduleIdle(alarms, endAt, idlePending(context, IDLE_END_ID, end));
            call.resolve();
        } catch (Exception error) { call.reject("Could not arm the workout check", error); }
    }

    @PluginMethod
    public void idleStop(PluginCall call) {
        try {
            Context context = getContext();
            context.getSharedPreferences(IDLE_PREFS, Context.MODE_PRIVATE).edit().clear().commit();
            AlarmManager alarms = context.getSystemService(AlarmManager.class);
            alarms.cancel(idlePending(context, IDLE_ASK_ID, new Intent(context, IdleReceiver.class)));
            alarms.cancel(idlePending(context, IDLE_END_ID, new Intent(context, IdleReceiver.class)));
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            manager.cancel(IDLE_ASK_ID);
            if (call.getBoolean("clearEnd", true)) manager.cancel(IDLE_END_ID);
            call.resolve();
        } catch (Exception error) { call.reject("Could not stop the workout check", error); }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        try {
            Context context = getContext();
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().commit();
            context.getSystemService(AlarmManager.class).cancel(alarmIntent(new Intent(context, RestTimerReceiver.class)));
            NotificationManager manager = context.getSystemService(NotificationManager.class);
            manager.cancel(RUNNING_ID);
            manager.cancel(DONE_ID);
            call.resolve();
        } catch (Exception error) { call.reject("Could not stop the rest notification", error); }
    }
}

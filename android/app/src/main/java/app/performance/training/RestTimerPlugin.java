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
import android.os.Build;
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
        } catch (Exception error) { call.reject("Dinlenme bildirimi başlatılamadı", error); }
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
        } catch (Exception error) { call.reject("Dinlenme bildirimi kapatılamadı", error); }
    }
}

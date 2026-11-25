package app.performance.training;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

// V37 · İdmanda telefonu bırak: 2 dk'da geri açma ve 40 dk sonrası titreşim alarmları (FocusGuard).
public class FocusReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        FocusGuard.fire(context, intent.getStringExtra("kind"), intent.getLongExtra("stamp", -1));
    }
}

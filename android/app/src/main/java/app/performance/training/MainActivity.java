package app.performance.training;

import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.WindowManager;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(RestTimerPlugin.class);
    // Capacitor önce koyu uygulama temasını ve WebView'i kursun.
    super.onCreate(savedInstanceState);
    EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    // Sistem yazı boyutu en fazla %115 uygulansın; daha büyüğü tasarımı bozuyor.
    WebSettings settings = getBridge().getWebView().getSettings();
    int zoom = Math.round(getResources().getConfiguration().fontScale * 100f);
    settings.setTextZoom(Math.max(100, Math.min(115, zoom)));
    focusBack(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    focusBack(intent);
  }

  // V37 · İdmanda 2 dk'da kendiliğinden geri açılış: ekranı yak, kilit ekranının üstünde göster.
  private void focusBack(Intent intent) {
    if (intent == null || !intent.getBooleanExtra(FocusGuard.EXTRA_BACK, false)) return;
    intent.removeExtra(FocusGuard.EXTRA_BACK);
    FocusGuard.markAuto(this);
    lockScreen(true);
  }

  private void lockScreen(boolean on) {
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(on);
      setTurnScreenOn(on);
    } else {
      int flags = WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON;
      if (on) getWindow().addFlags(flags); else getWindow().clearFlags(flags);
    }
  }

  @Override
  public void onStart() {
    super.onStart();
    FocusGuard.foreground(this);
  }

  @Override
  public void onStop() {
    super.onStop();
    lockScreen(false);
    FocusGuard.background(this);
  }

  @Override
  public boolean dispatchTouchEvent(MotionEvent ev) {
    if (ev.getActionMasked() == MotionEvent.ACTION_DOWN) FocusGuard.touch(this);
    return super.dispatchTouchEvent(ev);
  }
}

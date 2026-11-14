package app.performance.training;

import android.graphics.Color;
import android.os.Bundle;
import android.webkit.WebSettings;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Capacitor önce koyu uygulama temasını ve WebView'i kursun.
    super.onCreate(savedInstanceState);
    EdgeToEdge.enable(this, SystemBarStyle.dark(Color.TRANSPARENT), SystemBarStyle.dark(Color.TRANSPARENT));
    // Sistem yazı boyutu en fazla %115 uygulansın; daha büyüğü tasarımı bozuyor.
    WebSettings settings = getBridge().getWebView().getSettings();
    int zoom = Math.round(getResources().getConfiguration().fontScale * 100f);
    settings.setTextZoom(Math.max(100, Math.min(115, zoom)));
  }
}

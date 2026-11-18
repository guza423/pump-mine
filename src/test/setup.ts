import 'fake-indexeddb/auto';
import { setLang } from '../i18n';

// Mevcut testler Türkçe metinlerle yazıldı; uygulamanın varsayılanı İngilizce (V21).
// Her test dosyası Türkçe başlar; İngilizce testler dili kendileri seçer.
setLang('tr', false);

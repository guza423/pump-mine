# Görevler

Codex ya da Claude: önce `git pull --rebase origin main`, sonra `AGENTS.md`'yi, sonra bu dosyayı oku. "Bekleyen" listesindeki görevleri **sırayla** uygula. Her görev bitince satırını "Tamamlanan"a taşı (tarih + commit kısa kodu). `AGENTS.md`'deki "Her görevin sonunda" kuralı her görev için geçerli: test + build geçsin, doğrudan `main`'e push.

## Bekleyen
1. [`docs/gorevler/V09-hesap-ve-bulut.md`](docs/gorevler/V09-hesap-ve-bulut.md): Firebase ile hesap ve bulut veritabanı.
   - **Ön koşul tamam:** kökte `firebase-config.json`, ayrıca `android/app/google-services.json` (SHA-1 ve SHA-256 Firebase'e eklendi). Firebase konsolu (Auth, Firestore, kurallar) kullanıcı tarafında hazır.
   - Proje: `outmove-cd140`. Google girişi için web istemci kimliği `google-services.json` içindeki `client_type: 3` kaydıdır; google-services eklentisi bunu `default_web_client_id` olarak üretir.

## Tamamlanan
- V08 · 438 hareketlik kütüphane ve pliometrik kayıt: 2026-11-14 · `459a522`
- v0.7 arayüz taşıma: `4fb0bc1`
- Sabit APK imzası: `8e79ac6`

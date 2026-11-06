# Görevler

Codex ya da Claude: önce `git pull --rebase origin main`, sonra `AGENTS.md`'yi, sonra bu dosyayı oku. "Bekleyen" listesindeki görevleri **sırayla** uygula. Her görev bitince satırını "Tamamlanan"a taşı (tarih + commit kısa kodu). `AGENTS.md`'deki "Her görevin sonunda" kuralı her görev için geçerli: test + build geçsin, doğrudan `main`'e push.

## Bekleyen
1. [`docs/gorevler/V08-hareket-kutuphanesi.md`](docs/gorevler/V08-hareket-kutuphanesi.md): 438 hareketlik kütüphane, arama/filtre, pliometrik kayıt.
2. [`docs/gorevler/V09-hesap-ve-bulut.md`](docs/gorevler/V09-hesap-ve-bulut.md): Firebase ile hesap ve bulut veritabanı.
   - **Ön koşul:** kökte `firebase-config.json` (eklendi), ayrıca `android/app/google-services.json` (bekleniyor).
   - Yoksa başlama. V08'i bitir, kullanıcıya "Firebase dosyaları eksik, `docs/FIREBASE-KURULUM.md`" de ve dur.

## Tamamlanan
- v0.7 arayüz taşıma: `4fb0bc1`
- Sabit APK imzası: `8e79ac6`

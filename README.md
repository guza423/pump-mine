# PERFORMANCE

Android telefonları hedefleyen; sunucusuz, çevrimdışı çalışan kuvvet antrenmanı uygulaması. Faz 1, referans prototipteki Merkez, Günlük, Biyomekanik ve Yorgunluk modüllerini Vite + React + TypeScript üzerinde çalıştırır.

## Yerelde çalıştırma

Node.js 22 önerilir.

```bash
npm install
npm run dev
```

Üretim derlemesi ve model testleri:

```bash
npm test
npm run build
npm run preview
```

## Veri ve yedekleme

Programlar, antrenmanlar ve özel hareketler tarayıcının IndexedDB alanında tutulur; bir sunucuya gönderilmez. İlk açılışta **Hipertrofi bloğu** örnek programı eklenir.

Merkez ekranındaki **Yedekle** düğmesi bütün veriyi JSON olarak indirir. **Geri yükle**, seçilen PERFORMANCE yedeğini doğrular ve mevcut yerel verinin yerine koyar. Tarayıcı verilerini temizlemeden veya telefon değiştirmeden önce yedek alın.

## PWA ve canlı adres

Uygulama çevrimdışı önbelleğe alınır ve destekleyen mobil tarayıcılarda ana ekrana eklenebilir. Her push, test ve build başarılı olduğunda GitHub Pages'e otomatik olarak dağıtılır:

<https://guza423.github.io/pump-mine/>

İlk dağıtımdan önce depo ayarlarında **Settings → Pages → Source** alanı **GitHub Actions** olarak seçilmelidir.

## APK

APK üretimi Faz 2 kapsamındadır. O faz tamamlandığında debug APK, GitHub Actions çalıştırmasının **Artifacts** bölümünden indirilebilecek; kurulum adımları da burada yer alacaktır.

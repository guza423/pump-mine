# Gizlilik Politikası

Yürürlük ve sürüm tarihi: {{SURUM}}

Bu politika, {{UYGULAMA}} uygulamasını (Android uygulaması, [{{WEB}}]({{WEB}}) adresindeki web sürümü ve bu sayfalar; birlikte "Hizmet") kullanırken kişisel verilerinin nasıl işlendiğini anlatır. Türkiye’deki kullanıcılar için 6698 sayılı Kişisel Verilerin Korunması Kanunu’nu ("KVKK"), Avrupa Ekonomik Alanı (AEA) ve Birleşik Krallık’taki kullanıcılar için Avrupa Birliği Genel Veri Koruma Tüzüğü’nü (2016/679, "GDPR") ve Birleşik Krallık GDPR’ını esas alır. Türkiye’deki kullanıcılara ayrıca [KVKK Aydınlatma Metni](#doc:aydinlatma) sunulur; ikisi birbiriyle uyumludur.

## 1. Kısaca

- Verilerini satmayız, kiralamayız, reklam için kullanmayız ve yapay zekâ modeli eğitmek için kullanmayız.
- Uygulamada reklam, analiz (analytics), çökme raporlama ya da kullanıcı takibi yapan bir yazılım yoktur.
- Hesap açmadan kullanırsan kayıtların yalnızca kendi cihazında durur; bize hiç gelmez.
- Hesap açarsan kayıtların Google Firebase’in Almanya’daki (Frankfurt) sunucularında saklanır ve yalnızca sen erişirsin.
- Sağlıkla ilişkili sayılabilecek verilerini (uyku, zorlanma, yorgunluk, notlar) bulutta yalnızca ayrı [açık rızanla](#doc:riza) saklarız. Rızanı istediğin an geri alabilirsin.
- Verilerini istediğin an uygulama içinden görebilir, düzeltebilir, dışa aktarabilir (JSON) ve silebilirsin. Hesabını da uygulama içinden tek başına silebilirsin.

## 2. Veri sorumlusu

- Unvan: {{SIRKET}} ({{SIRKET_ACIKLAMA}})
- Adres: {{ADRES}}
- Gizlilik ve veri koruma iletişimi: {{EPOSTA}}
- KVKK kapsamında Türkiye’deki veri sorumlusu temsilcisi: {{TR_TEMSILCI}}
- GDPR m.27 kapsamında AB temsilcisi: {{AB_TEMSILCI}}
- Veri koruma görevlisi (DPO): Şu an atanmamıştır. Yasal zorunluluk doğarsa atanır ve bu metinde ilan edilir.

Bu politikada "biz" ve "Şirket" {{SIRKET}}’i, "sen" ve "kullanıcı" Hizmet’i kullanan kişiyi ifade eder.

## 3. Hizmeti iki şekilde kullanabilirsin

### 3.1 Misafir (hesapsız) kullanım

- Planların, antrenmanların, setlerin, notların, uyku girişlerin, hedeflerin ve ayarların yalnızca cihazında, uygulamanın kendi depolama alanında (IndexedDB) tutulur.
- Bu veriler bize gönderilmez; bunlara erişimimiz yoktur. Yorgunluk ve gelişim hesapları cihazında yapılır.
- Uygulamayı silersen, uygulama verisini temizlersen ya da cihazını kaybedersen bu kayıtlar kaybolabilir. Kopya almak için "Dışa aktar" ile JSON dosyası oluşturabilirsin; bu dosya senin kontrolündedir.
- Android’in otomatik yedekleme özelliği açıksa, cihazındaki uygulama verileri işletim sistemi tarafından Google hesabına yedeklenebilir. Bu yedekleme senin ile Google arasındadır; biz bu yedeklere erişemeyiz. Cihaz ayarlarından kapatabilirsin.

### 3.2 Hesaplı (bulut) kullanım

- Google ile ya da e-posta ve şifreyle hesap açabilirsin.
- Kayıtların Google Firebase altyapısında, {{BOLGE}} bölgesinde saklanır ve cihazların arasında eşitlenir. İnternet yokken cihazında bir kopya tutulur ve bağlantı gelince gönderilir.
- Hesaba geçtiğinde cihazdaki misafir kayıtların hesabına taşınır. Taşımadan sonra bu kayıtların bir güvenlik kopyası 30 gün cihazında kalır, sonra otomatik silinir.

## 4. İşlediğimiz kişisel veriler

| Kategori | Neler | Nereden | Hangi kullanımda |
|---|---|---|---|
| Hesap ve kimlik doğrulama | E-posta adresi, kullanıcı kimliği (UID), giriş yöntemi, hesabın oluşturulma tarihi. E-postayla girişte şifren yalnızca Firebase tarafından tek yönlü özet (hash) olarak tutulur; biz göremeyiz. Google ile girişte Google’ın paylaştığı ad, e-posta ve profil fotoğrafı bağlantısı Firebase kimlik kaydına yazılır; uygulamada adını ve fotoğrafını kullanmayız. | Senden ve Google’dan | Hesaplı |
| Antrenman kayıtları | Planlar, antrenman günleri, seçtiğin ve oluşturduğun hareketler, setler (ağırlık, tekrar, seviye, temas sayısı, hareket açıklığı), set zamanları, dinlenme süreleri, antrenman başlangıç ve bitiş saatleri, etiketler | Senden | Her ikisi |
| Sağlıkla ilişkili olabilecek veriler | Uyku saatlerin; zorlanma ve yorgunluk girişlerin (RPE, RIR gibi); notlarına yazabileceğin ağrı, sakatlık, enerji gibi bilgiler; bu girdilerden hesaplanan yorgunluk, toparlanma ve yük tahminleri | Senden ve uygulamanın hesabından | Her ikisi. Bulutta yalnızca açık rızanla |
| Hedefler ve ayarlar | Kuvvet ve antrenman hedeflerin, ses, titreşim ve animasyon tercihleri, dinlenme süresi tercihleri | Senden | Her ikisi |
| Onay kayıtları | Kabul ettiğin metinlerin sürümü ve tarihi, açık rıza durumu, verildiği ve geri alındığı tarih, uygulama sürümü | Otomatik | Hesaplı (misafirde yalnızca cihazında) |
| Teknik ve güvenlik verileri | IP adresi, cihaz ve tarayıcı bilgisi (user agent), giriş zamanları | Otomatik, Firebase Authentication tarafından | Hesaplı |
| İletişim yazışmaları | E-posta adresin ve bize yazdıkların | Senden | Bize yazarsan |

İşlemediğimiz veriler: Ad-soyadını ayrıca istemeyiz. T.C. kimlik numarası, telefon numarası, konum, rehber, fotoğraf, kamera, mikrofon, reklam kimliği, ödeme bilgisi ve başka sağlık uygulamalarındaki (ör. Health Connect) verilerin toplanmaz.

Notlar serbest metindir. Notlarına kendin ya da başkaları hakkında gereksiz özel bilgi yazmamanı öneririz.

## 5. Amaçlar ve hukuki sebepler

| Amaç | Veriler | KVKK | GDPR |
|---|---|---|---|
| Hesabı açmak, girişi sağlamak, hesabı korumak | Hesap, teknik ve güvenlik verileri | m.5/2-c: sözleşmenin kurulması ve ifası; m.5/2-f: güvenlik için meşru menfaat | m.6/1-b; m.6/1-f |
| Antrenman kayıtlarını saklamak, göstermek ve cihazlar arasında eşitlemek | Antrenman kayıtları, hedefler ve ayarlar | m.5/2-c | m.6/1-b |
| Sağlıkla ilişkili verileri bulutta saklamak, eşitlemek, yorgunluk ve toparlanma hesaplarında kullanmak | Sağlıkla ilişkili olabilecek veriler | m.6/3-a: açık rıza | m.9/2-a: açık rıza |
| Onay ve rıza kayıtlarını tutmak, hukuki yükümlülükleri yerine getirmek, başvurularını cevaplamak | Onay kayıtları, yazışmalar | m.5/2-ç: hukuki yükümlülük; m.5/2-e | m.6/1-c; m.6/1-f |
| Bir uyuşmazlıkta hakların tesisi, kullanılması ve korunması | Gerekli olan veriler | m.5/2-e; özel nitelikli veride m.6/3-e | m.6/1-f; m.9/2-f |
| Destek taleplerini cevaplamak | İletişim yazışmaları | m.5/2-c; m.5/2-f | m.6/1-b; m.6/1-f |

Meşru menfaate dayandığımız durumlarda menfaatimiz Hizmet’in ve hesabının güvenliğini sağlamak, kötüye kullanımı önlemektir. Bu dengeye itiraz edebilirsin (bkz. Bölüm 10).

Hesap açmak için açık rıza vermek zorunda değilsin. Rıza vermezsen Hizmet’i misafir olarak, verilerin yalnızca cihazında kalacak şekilde, tüm işlevleriyle kullanmaya devam edebilirsin. Bulut eşitleme ise açık rıza gerektirir, çünkü antrenman kayıtlarını sağlıkla ilişkili girdilerden ayırmak hizmetin doğası gereği mümkün değildir.

Otomatik değerlendirme: Yorgunluk, toparlanma, tahmini maksimum ve yük hesapları girdilerinden otomatik olarak üretilir. Bunlar yalnızca bilgilendirme amaçlıdır; senin hakkında hukuki ya da benzer önemli sonuç doğuran otomatik bir karar verilmez (GDPR m.22). KVKK m.11/1-g kapsamında bu sonuçlara itiraz hakkın saklıdır.

## 6. Verilerin kimlerle paylaşılır

Verilerini satmayız. Yalnızca aşağıdaki alıcılarla, belirtilen amaçla ve gerektiği kadar paylaşırız.

- Hizmet sağlayıcımız Google (Firebase Authentication ve Cloud Firestore): Bizim adımıza ve talimatımızla veri işleyen olarak çalışır. Firestore verileri {{BOLGE}} bölgesinde tutulur. Firebase Authentication verileri Google’ın açıkladığı üzere ABD dahil Google tesislerinde işlenebilir. İlişki, Google’ın veri işleme ve güvenlik şartlarıyla (Firebase Data Processing and Security Terms) düzenlenir.
- GitHub, Inc. (ABD): Web sürümünü ve bu sayfaları barındırır. Web sürümünü ziyaret ettiğinde GitHub, kendi gizlilik bildirimi kapsamında güvenlik amacıyla IP adresini işler.
- Bağımsız veri sorumluları: Google ile giriş yaparsan Google hesabın; uygulamayı Google Play’den indirirsen Google Play; cihazının işletim sistemi (bildirimler, otomatik yedekleme). Bu hizmetler kendi gizlilik politikalarına tabidir.
- Yetkili kamu kurum ve kuruluşları ile yargı mercileri: Yalnızca kanunen zorunlu olduğunda ve talep edilen ölçüde.
- Hukuk ve danışmanlık hizmeti alınan kişiler: Bir uyuşmazlıkta hakların korunması için gerektiği ölçüde ve sır saklama yükümlülüğü altında.
- Şirket birleşmesi, devri ya da satışı halinde devralan taraf: Bu politikadaki güvencelerle bağlı kalmak kaydıyla. Böyle bir durumda seni önceden bilgilendiririz.

Her kullanıcı yalnızca kendi verisine erişebilir; bu kural sunucu tarafında zorunlu tutulur. Diğer kullanıcılar verilerini göremez.

## 7. Yurt dışına aktarım

{{SIRKET}} Amerika Birleşik Devletleri’nde kuruludur. Hesaplı kullanımda verilerini uygulama aracılığıyla doğrudan yurt dışında yerleşik veri sorumlusuna ve onun altyapısına iletirsin. Firestore verileri Almanya’da tutulur. Kimlik doğrulama verileri, teknik destek ve Hizmet’in işletilmesi kapsamında veriler ABD’de de işlenebilir.

- KVKK: Yurt dışına aktarım niteliğindeki işlemlerde KVKK m.9’a ve Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik’e uyarız. Hakkında yeterlilik kararı bulunmayan ülkelere aktarımlarda Kurul’un ilan ettiği standart sözleşme gibi uygun güvencelere dayanırız; standart sözleşmeler imzalanmalarından itibaren beş iş günü içinde Kişisel Verileri Koruma Kurumu’na bildirilir.
- GDPR: GDPR m.3/2 uyarınca doğrudan Tüzüğe tabiyiz. AEA dışına aktarımlarda AB–ABD Veri Gizliliği Çerçevesi (Data Privacy Framework) kapsamındaki yeterlilik kararına ve/veya Avrupa Komisyonu’nun standart sözleşme hükümlerine dayanırız. Uygulanan güvencelerin bir örneğini bize yazarak isteyebilirsin.

## 8. Saklama süreleri

| Veri | Süre |
|---|---|
| Hesap ve antrenman kayıtları (bulut) | Hesabın açık olduğu sürece. Hesabını silince aktif sistemlerimizden hemen silinir. |
| Sağlıkla ilişkili veriler (bulut) | Açık rızan sürdüğü sürece. Rızanı geri alınca buluttan hemen silinir. |
| Misafir kayıtları | Yalnızca cihazında, sen silene kadar. |
| Hesaba geçişteki misafir güvenlik kopyası | 30 gün, yalnızca cihazında; sonra otomatik silinir. Hesabını silersen hemen. |
| Teknik ve güvenlik kayıtları (IP vb.) | Google’ın belirlediği kısa süre (birkaç hafta) boyunca Firebase tarafından. |
| Onay ve rıza kayıtları | İlgili hesap silinene kadar. |
| Başvuru ve destek yazışmaları | Talebin sonuçlanmasından itibaren en fazla 2 yıl. |

Silinen veriler, hizmet sağlayıcının yedekleme ve kayıt sistemlerinden kendi döngüleri içinde kalıcı olarak silinir; bu sürede başka bir amaçla kullanılmaz. Saklama sebebi ortadan kalkan veriler ilgili mevzuata göre silinir, yok edilir ya da anonim hale getirilir; periyodik imha gerektiren durumlarda süre 6 ayı aşmaz.

## 9. Güvenlik

- Uygulama ile sunucu arasındaki tüm trafik şifrelidir (TLS). Veriler Google altyapısında bekleme halinde de şifrelenir.
- Sunucu kuralları her kullanıcının yalnızca kendi verisine erişmesine izin verir.
- Şifreni biz tutmayız ve göremeyiz.
- Yalnızca hizmet için gereken veriyi toplarız. Şirket içinde verilere erişim, Hizmet’in işletilmesi, güvenlik ve senin talebin için zorunlu olduğu ölçüde yapılır.
- Bir veri ihlali olursa, KVKK m.12 uyarınca Kurul’a en kısa sürede ve en geç 72 saat içinde, etkilenen kişilere de en kısa sürede bildirimde bulunuruz. GDPR kapsamındaki bildirimler m.33 ve m.34’e göre yapılır.
- Senin de yapabileceklerin: Cihazına ekran kilidi koy, güçlü ve başka yerde kullanmadığın bir şifre seç. Dışa aktardığın JSON dosyaları şifresizdir; onları güvenli yerde sakla.

## 10. Hakların

### 10.1 KVKK m.11 kapsamındaki hakların

Veri sorumlusuna başvurarak:

- a) Kişisel verilerinin işlenip işlenmediğini öğrenme,
- b) İşlenmişse buna ilişkin bilgi talep etme,
- c) İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,
- ç) Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,
- d) Eksik veya yanlış işlenmişse düzeltilmesini isteme,
- e) KVKK m.7’deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,
- f) (d) ve (e) bentlerindeki işlemlerin, verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,
- g) İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhine bir sonucun ortaya çıkmasına itiraz etme,
- ğ) Kanuna aykırı işleme sebebiyle zarara uğraman halinde zararın giderilmesini talep etme haklarına sahipsin.

### 10.2 GDPR kapsamındaki hakların (AEA ve Birleşik Krallık)

Erişim (m.15), düzeltme (m.16), silme (m.17), işlemenin kısıtlanması (m.18), veri taşınabilirliği (m.20), itiraz (m.21), otomatik karar almaya tabi olmama (m.22) ve rızanı dilediğin an geri alma (m.7/3) hakların vardır. Rızanın geri alınması, geri almadan önceki işlemlerin hukuka uygunluğunu etkilemez. Ayrıca oturduğun, çalıştığın ya da ihlalin gerçekleştiği AEA ülkesindeki denetim makamına şikâyette bulunabilirsin.

### 10.3 Uygulama içinden hemen kullanabileceklerin

- Görme ve düzeltme: Tüm kayıtların uygulamada görünür ve düzenlenebilir.
- Taşınabilirlik: Hesap › Verilerimi dışa aktar (JSON).
- Silme: Tek tek kayıtları silebilir, Hesap › Hesabı sil ile hesabını ve tüm bulut verilerini silebilirsin. Misafirsen Hesap › Bu telefondaki verileri sil.
- Rızayı geri alma: Hesap › Açık rızamı geri al. Bulut verilerin silinir, kayıtların bu cihazda misafir olarak kalır.
- Ayrıntılar: [Hesap ve veri silme](#doc:silme).

### 10.4 Başvuru yolu ve süre

- E-posta: Uygulamada kayıtlı e-posta adresinden {{EPOSTA}} adresine.
- Yazılı: {{ADRES}} adresine ıslak imzalı dilekçeyle.
- Ayrıca kayıtlı elektronik posta (KEP), güvenli elektronik imza veya mobil imza ile.

Başvurunda adını-soyadını, Türk vatandaşıysan T.C. kimlik numaranı, yabancıysan uyruğunu ve pasaport ya da kimlik numaranı, tebligata esas adresini, e-posta adresini ve talebini açıkça yaz (Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ). Kimliğini doğrulamak için ek bilgi isteyebiliriz.

- KVKK: Başvuruyu en geç 30 gün içinde ücretsiz sonuçlandırırız. İşlem ayrıca bir maliyet gerektirirse Kurul’un belirlediği tarifeye göre ücret alınabilir.
- GDPR: En geç 1 ay içinde cevap veririz. Karmaşık ya da çok sayıda talepte bu süre bildirmek kaydıyla 2 ay uzatılabilir.
- Başvurun reddedilir, cevabımızı yetersiz bulursan ya da süresinde cevap verilmezse, cevabı öğrendiğin tarihten itibaren 30 gün ve her durumda başvuru tarihinden itibaren 60 gün içinde Kişisel Verileri Koruma Kurulu’na şikâyette bulunabilirsin (KVKK m.14).

## 11. Yaş sınırı

Hizmet {{YAS}} yaşından küçükler için değildir ve bilerek {{YAS}} yaşından küçüklerin verisini işlemeyiz. Böyle bir hesabı fark edersek hesabı ve verilerini sileriz. Ebeveyn ya da vasiysen {{EPOSTA}} adresine yazabilirsin.

## 12. Cihaz izinleri ve bildirimler

- Bildirim: Dinlenme süresi bittiğinde haber vermek için. Bildirimler cihazında oluşturulur; sunucudan bildirim göndermeyiz.
- Kesin zamanlı alarm: Dinlenme sayacının tam zamanında bitmesi için.
- Titreşim: Set ve sayaç geri bildirimi için. Ayarlardan kapatabilirsin.
- İnternet: Hesaplı kullanımda eşitleme ve giriş için.

Konum, kamera, mikrofon, rehber veya dosya erişimi istemeyiz. Dışa ve içe aktarma yalnızca senin seçtiğin dosya ile yapılır.

## 13. Çerezler ve yerel depolama

Uygulama ve web sürümü takip ya da reklam çerezi kullanmaz. Cihazında yalnızca Hizmet’in çalışması için zorunlu depolama kullanılır: kayıtların (IndexedDB), giriş oturumun (Firebase Authentication) ve kabul ettiğin metinlerin sürümü (yerel depolama). Bu depolama Hizmet’in çalışması için kesinlikle gerekli olduğundan ayrıca onay gerektirmez.

## 14. Değişiklikler

Bu politikayı güncelleyebiliriz. Her sürüm yukarıdaki tarihle yayımlanır. Önemli değişikliklerde uygulamada seni bilgilendirir, gerekiyorsa yeniden onayını ya da rızanı isteriz. Önceki sürümleri bize yazarak isteyebilirsin.

## 15. İletişim

{{SIRKET}}
{{ADRES}}
{{EPOSTA}}

İlgili metinler: [KVKK Aydınlatma Metni](#doc:aydinlatma) · [Açık Rıza Metni](#doc:riza) · [Kullanım Koşulları](#doc:kosullar) · [Hesap ve veri silme](#doc:silme) · [Privacy Policy (English)](#doc:privacy-en)

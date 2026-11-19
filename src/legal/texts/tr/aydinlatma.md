# KVKK Aydınlatma Metni

Sürüm tarihi: {{SURUM}}

Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu’nun ("KVKK") 10. maddesi ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ uyarınca, {{UYGULAMA}} uygulamasını kullanan kişileri bilgilendirmek için hazırlanmıştır. Bu metin bir onay ya da rıza metni değildir; yalnızca bilgilendirme amaçlıdır. Açık rıza gerektiren işlemler için ayrı bir [Açık Rıza Metni](#doc:riza) sunulur.

## 1. Veri sorumlusu ve temsilcisi

- Veri sorumlusu: {{SIRKET}} ({{SIRKET_ACIKLAMA}})
- Adres: {{ADRES}}
- E-posta: {{EPOSTA}}
- Veri sorumlusu temsilcisi (Türkiye): {{TR_TEMSILCI}}

## 2. Hangi verileri işliyoruz

Hesap açmadan (misafir) kullandığında kayıtların yalnızca cihazında tutulur ve tarafımıza iletilmez. Hesap açtığında aşağıdaki veriler işlenir:

- Kimlik ve iletişim: E-posta adresi; Google ile girişte Google hesabının paylaştığı ad ve profil fotoğrafı bağlantısı.
- Müşteri işlem: Kullanıcı kimliği (UID), giriş yöntemi, hesabın oluşturulma tarihi.
- İşlem güvenliği: IP adresi, cihaz ve tarayıcı bilgisi, giriş zamanları, şifrenin tek yönlü özeti (Firebase tarafından).
- Antrenman kayıtları: Planlar, hareketler, setler (ağırlık, tekrar, seviye, hareket açıklığı), set ve antrenman zamanları, dinlenme süreleri, hedefler, uygulama ayarları.
- Sağlık verisi niteliği taşıyabilecek veriler (özel nitelikli): Uyku saatleri, zorlanma ve yorgunluk girişleri (RPE, RIR), notlarına yazabileceğin ağrı ve sakatlık gibi bilgiler ile bunlardan hesaplanan yorgunluk ve toparlanma tahminleri.
- Hukuki işlem: Kabul edilen metin sürümleri, açık rıza kaydı ve tarihleri, başvuru yazışmaları.

## 3. İşleme amaçları ve hukuki sebepler

| Amaç | Hukuki sebep |
|---|---|
| Üyelik hesabının oluşturulması, girişin sağlanması, hesabın ve kayıtların saklanması, cihazlar arasında eşitlenmesi | KVKK m.5/2-c: Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması |
| Hesap ve sistem güvenliğinin sağlanması, kötüye kullanımın önlenmesi | KVKK m.5/2-f: Temel hak ve özgürlüklerine zarar vermemek kaydıyla meşru menfaatimiz |
| Onay kayıtlarının tutulması, mevzuattan doğan yükümlülüklerin ve başvurularının yerine getirilmesi | KVKK m.5/2-ç: Hukuki yükümlülüğümüzü yerine getirebilmemiz için zorunlu olması |
| Bir hakkın tesisi, kullanılması veya korunması | KVKK m.5/2-e; özel nitelikli verilerde m.6/3-e |
| Sağlık verisi niteliği taşıyabilecek verilerin bulutta saklanması ve yorgunluk, toparlanma hesaplarında kullanılması | KVKK m.6/3-a: Açık rızan. Açık rıza vermezsen bu veriler buluta gönderilmez; uygulamayı misafir olarak kullanmaya devam edebilirsin. |

## 4. Toplama yöntemi

Veriler; uygulamaya girdiğin bilgilerle, Google ile giriş yaptığında Google’dan, ve hizmetin kullanımı sırasında Firebase Authentication tarafından otomatik yollarla, elektronik ortamda toplanır.

## 5. Kimlere ve hangi amaçla aktarılır

- Hizmet sağlayıcımız Google’a (Firebase Authentication ve Cloud Firestore), veri işleyen sıfatıyla; barındırma, kimlik doğrulama ve eşitleme amacıyla. Firestore verileri Almanya’da (Frankfurt) tutulur; kimlik doğrulama verileri ABD dahil Google tesislerinde işlenebilir.
- Yetkili kamu kurum ve kuruluşları ile yargı mercilerine, yalnızca kanunen zorunlu olduğunda.
- Hukuki destek aldığımız kişilere, hakların korunması için gerektiği ölçüde.

Veri sorumlusu ABD’de yerleşik olduğundan, hesaplı kullanımda verilerini uygulama aracılığıyla doğrudan yurt dışındaki veri sorumlusuna iletmiş olursun. Yurt dışına aktarım niteliğindeki işlemlerde KVKK m.9 ve Kişisel Verilerin Yurt Dışına Aktarılmasına İlişkin Usul ve Esaslar Hakkında Yönetmelik’te öngörülen uygun güvencelere (standart sözleşme ve Kuruma bildirimi) dayanılır. Verilerin satılmaz ve reklam amacıyla paylaşılmaz.

## 6. Saklama süresi

Hesap ve antrenman verileri hesabın açık olduğu sürece; özel nitelikli veriler açık rızan sürdüğü sürece saklanır. Hesabını sildiğinde ya da rızanı geri aldığında ilgili veriler derhal silinir. Ayrıntılar [Gizlilik Politikası](#doc:gizlilik) Bölüm 8’dedir.

## 7. KVKK m.11 kapsamındaki hakların

Veri sorumlusuna başvurarak; kişisel verilerinin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini isteme, KVKK m.7’deki şartlar çerçevesinde silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhine bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğraman halinde zararın giderilmesini talep etme haklarına sahipsin.

## 8. Başvuru

Başvurunu, uygulamada kayıtlı e-posta adresinden {{EPOSTA}} adresine, yazılı olarak {{ADRES}} adresine ya da kayıtlı elektronik posta (KEP), güvenli elektronik imza veya mobil imza ile iletebilirsin. Başvurun en geç 30 gün içinde ücretsiz sonuçlandırılır. Başvuru usulü ve şikâyet hakkın [Gizlilik Politikası](#doc:gizlilik) Bölüm 10’da anlatılmıştır.

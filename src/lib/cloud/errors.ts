export function accountError(error: unknown) {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'auth/wrong-password': 'Şifre yanlış.', 'auth/invalid-credential': 'E-posta veya şifre yanlış.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı kullanıcı yok.', 'auth/email-already-in-use': 'Bu e-posta zaten kullanımda.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.', 'auth/invalid-email': 'Geçerli bir e-posta gir.',
    'auth/network-request-failed': 'Ağ bağlantısı kurulamadı. İnternetini kontrol et.',
    'auth/popup-closed-by-user': 'Google girişi kapatıldı.', 'auth/popup-blocked': 'Google giriş penceresine izin ver.',
    'auth/requires-recent-login': 'Tekrar giriş yapıp silmeyi yeniden dene.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.',
    'permission-denied': 'Bulut erişimi reddedildi. Hesap ve Firestore kurallarını kontrol et.',
    'failed-precondition': 'Bulut önbelleği başka bir sekmede açık olabilir. Diğer sekmeyi kapatıp yeniden dene.',
    'unavailable': 'İnternete bağlanınca taşınacak.',
  };
  return messages[code || ''] || (error instanceof Error && !code ? error.message : 'İşlem tamamlanamadı. Yeniden dene.');
}

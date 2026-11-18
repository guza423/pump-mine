import { LEGAL } from './meta';

// Kullanım Koşulları kabulü ve aydınlatmanın okunduğu bilgisi cihazda tutulur.
// Hesap açılınca aynı kayıt kullanıcının belgesine de yazılır (runtime.accept).
export const LEGAL_KEY = 'outmove.legal';

export interface LegalAcceptance {
  /** Kabul edilen metin sürümü (LEGAL.VERSION). */
  v: string;
  /** Kabul zamanı (ms). */
  at: number;
}

export function readAcceptance(): LegalAcceptance | null {
  try {
    const raw = localStorage.getItem(LEGAL_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed.v === 'string' && typeof parsed.at === 'number' ? parsed : null;
  } catch {
    return null;
  }
}

export const acceptanceCurrent = () => readAcceptance()?.v === LEGAL.VERSION;

export function saveAcceptance(): LegalAcceptance {
  const value = { v: LEGAL.VERSION, at: Date.now() };
  try { localStorage.setItem(LEGAL_KEY, JSON.stringify(value)); } catch { /* özel modda depolama yoksa yalnızca bu oturum için geçerli */ }
  return value;
}

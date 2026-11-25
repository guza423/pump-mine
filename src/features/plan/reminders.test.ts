import { describe, expect, it } from 'vitest';
import { focusPrefs, remindPrefs, remindersOn } from './reminders';

describe('reminders ayarı (V33 + V37)', () => {
  it('varsayılanlar açık', () => {
    expect(remindersOn([])).toBe(true);
    expect(focusPrefs([])).toEqual({ back: true, end: true });
  });
  it('eski { plan } kaydı okunur, yeni anahtarlar varsayılanla tamamlanır', () => {
    const s = [{ key: 'reminders', value: { plan: false } }];
    expect(remindPrefs(s)).toEqual({ plan: false, back: true, end: true });
  });
  it('tek anahtar kapanır', () => {
    const s = [{ key: 'reminders', value: { plan: true, back: false, end: true } }];
    expect(focusPrefs(s)).toEqual({ back: false, end: true });
    expect(remindersOn(s)).toBe(true);
  });
});

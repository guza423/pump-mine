// İngilizce sözlük: alan dosyaları birleşir. Aynı anahtar iki dosyada farklı değerle olamaz (i18n.test.ts denetler).
import type { Entry } from '../index';
import { common } from './common';
import { dashboard } from './dashboard';
import { account } from './account';
import { legal } from './legal';
import { workout } from './workout';

export const EN_PARTS: Record<string, Record<string, Entry>> = { common, dashboard, account, legal, workout };
export const EN: Record<string, Entry> = Object.assign({}, ...Object.values(EN_PARTS));

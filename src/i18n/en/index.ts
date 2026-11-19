// İngilizce sözlük: alan dosyaları birleşir. Aynı anahtar iki dosyada farklı değerle olamaz (i18n.test.ts denetler).
import type { Entry } from '../types';
import { common } from './common';
import { dashboard } from './dashboard';
import { account } from './account';
import { legal } from './legal';
import { workout } from './workout';
import { insights } from './insights';
import { lab } from './lab';

export const EN_PARTS: Record<string, Record<string, Entry>> = { common, dashboard, account, legal, workout, insights, lab };
export const EN: Record<string, Entry> = Object.assign({}, ...Object.values(EN_PARTS));

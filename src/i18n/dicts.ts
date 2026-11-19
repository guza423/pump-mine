// Dil paketleri (V26). Türkçe kaynak dildir, paketi yoktur. Yeni dilin paketi buraya bir satırla eklenir.
import type { LangPack } from './types';
import { EN } from './en';

export const PACKS: Record<string, LangPack> = {
  en: { dict: EN },
};

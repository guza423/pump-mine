/// <reference types="node" />
// V21 · dil katmanı: çeviri işlevleri, sözlük bütünlüğü ve kaynak taraması.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { byLang, getLang, num, numIn, pct, setLang, t, tc } from './index';
import { EN, EN_PARTS } from './en';
import { dayLabel, exName } from './names';
// @ts-expect-error: .mjs betiği tip bildirimi olmadan içe aktarılır
import { collectKeys } from '../../scripts/i18n-keys.mjs';

const TR_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

afterEach(() => setLang('tr', false));

describe('çeviri işlevleri', () => {
  it('varsayılan dil İngilizce', async () => {
    vi.resetModules();
    const fresh = await import('./index');
    expect(fresh.DEFAULT_LANG).toBe('en');
    expect(fresh.getLang()).toBe('en');
  });

  it('Türkçede kaynak metni, İngilizcede sözlüğü döndürür; değişkenleri ve çoğulu doldurur', () => {
    setLang('tr', false);
    expect(t('Kaydet')).toBe('Kaydet');
    expect(t('{n} antrenman', { n: 3 })).toBe('3 antrenman');
    setLang('en', false);
    expect(getLang()).toBe('en');
    expect(t('Kaydet')).toBe('Save');
    expect(t('{n} antrenman', { n: 1 })).toBe('1 workout');
    expect(t('{n} antrenman', { n: 3 })).toBe('3 workouts');
    expect(t('{wd}, {d} {m}', { wd: 'Thursday', d: 19, m: 'November' })).toBe('Thursday, November 19');
    expect(t('sözlükte olmayan metin')).toBe('sözlükte olmayan metin');
  });

  it('bağlamlı anahtar önce bağlamı, sonra düz anahtarı dener', () => {
    setLang('en', false);
    expect(tc('muscle', 'Göğüs')).toBe('Chest');
  });

  it('byLang okunduğu an etkin dili döndürür', () => {
    const W = byLang({ tr: ['Pazar', 'Pazartesi'], en: ['Sunday', 'Monday'] });
    setLang('tr', false);
    expect(W[1]).toBe('Pazartesi');
    setLang('en', false);
    expect(W[1]).toBe('Monday');
    expect(W.map((x) => x[0])).toEqual(['S', 'M']);
  });

  it('sayı, giriş sayısı ve yüzde dile göre biçimlenir', () => {
    setLang('tr', false);
    expect(num(82.5)).toBe('82,5');
    expect(numIn(1234.5)).toBe('1234,5');
    expect(pct(40)).toBe('%40');
    setLang('en', false);
    expect(num(82.5)).toBe('82.5');
    expect(num(1234)).toBe('1,234');
    expect(numIn(1234.5)).toBe('1234.5');
    expect(pct(40)).toBe('40%');
  });

  it('kütüphane hareketi İngilizce adla, özel hareket yazıldığı gibi görünür; gün adları çevrilir', () => {
    setLang('en', false);
    expect(exName({ exId: 'egimli-bench', name: 'Eğimli bench press' })).toBe('Incline barbell bench press');
    expect(exName({ exId: 'x_1', name: 'Benim hareketim' })).toBe('Benim hareketim');
    expect(dayLabel('2. gün')).toBe('Day 2');
    expect(dayLabel('Plansız antrenman')).toBe('Quick workout');
    expect(dayLabel('İtiş günü')).toBe('İtiş günü');
    setLang('tr', false);
    expect(exName({ exId: 'egimli-bench', name: 'Eğimli bench press' })).toBe('Eğimli bench press');
    expect(dayLabel('2. gün')).toBe('2. gün');
  });
});

describe('sözlük bütünlüğü', () => {
  it('kaynakta t()/tc() ile çevrilen her metnin İngilizcesi var', () => {
    const keys: Map<string, string> = collectKeys();
    const missing = [...keys].filter(([k]) => EN[k] == null).map(([k, f]) => `${f}: ${k}`);
    expect(missing).toEqual([]);
  });

  it('İngilizce değerlerde Türkçe harf yok ve değişkenler aynı', () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(EN)) {
      for (const s of typeof v === 'string' ? [v] : v) {
        if (TR_CHARS.test(s)) bad.push(`Türkçe harf: ${k} → ${s}`);
        const want = vars(k.replace(/^[a-z]+\|/, ''));
        if (vars(s).join(',') !== want.join(',')) bad.push(`değişken: ${k} → ${s}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('aynı anahtar iki alan dosyasında farklı değerle tanımlı değil', () => {
    const seen = new Map<string, string>();
    const clash: string[] = [];
    for (const [part, dict] of Object.entries(EN_PARTS)) {
      for (const [k, v] of Object.entries(dict)) {
        const val = JSON.stringify(v);
        const prev = seen.get(k);
        if (prev && prev !== val) clash.push(`${part}: ${k}`);
        seen.set(k, val);
      }
    }
    expect(clash).toEqual([]);
  });
});

// `t` kısa bir ad; bir dosyada aynı adla yerel değişken (ör. `const t = Date.now()`) çağrıyı gölgelerse
// çeviri yerine çalışma zamanı hatası olur. Dosyaların çoğu @ts-nocheck olduğu için bunu burada yakalarız.
describe('t çağrıları gölgelenmez', () => {
  const root = resolve(import.meta.dirname, '../..');
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
  const declares = (node: ts.Node, name: string): boolean => {
    const bindsName = (b: ts.BindingName): boolean => ts.isIdentifier(b) ? b.text === name
      : b.elements.some((e) => !ts.isOmittedExpression(e) && bindsName(e.name));
    if (ts.isFunctionLike(node)) return node.parameters.some((p) => bindsName(p.name));
    if (ts.isBlock(node) || ts.isSourceFile(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      return node.statements.some((s) => ts.isVariableStatement(s) && s.declarationList.declarations.some((d) => bindsName(d.name))
        || (ts.isFunctionDeclaration(s) && s.name?.text === name));
    }
    if (ts.isForStatement(node) || ts.isForOfStatement(node) || ts.isForInStatement(node)) {
      const init = node.initializer;
      return !!init && ts.isVariableDeclarationList(init) && init.declarations.some((d) => bindsName(d.name));
    }
    if (ts.isCatchClause(node)) return !!node.variableDeclaration && bindsName(node.variableDeclaration.name);
    return false;
  };

  it('her t(…) ve tc(…) çağrısı i18n içe aktarımına bağlanır', () => {
    const bad: string[] = [];
    for (const file of walk(join(root, 'src'))) {
      const text = readFileSync(file, 'utf8');
      if (!/\bt\(|\btc\(/.test(text)) continue;
      const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const imported = (name: string) => sf.statements.some((s) => ts.isImportDeclaration(s) && (/i18n/.test((s.moduleSpecifier as ts.StringLiteral).text) || (/src[\\/]i18n[\\/]/.test(file) && ['./index', '.'].includes((s.moduleSpecifier as ts.StringLiteral).text)))
        && !!s.importClause?.namedBindings && ts.isNamedImports(s.importClause.namedBindings)
        && s.importClause.namedBindings.elements.some((e) => e.name.text === name));
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && (node.expression.text === 't' || node.expression.text === 'tc')) {
          const name = node.expression.text;
          const isI18nFile = /src[\\/]i18n[\\/]index\.ts$/.test(file);
          let shadow = false;
          for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
            if (!ts.isSourceFile(p) && declares(p, name)) { shadow = true; break; }
          }
          if (shadow || (!isI18nFile && !imported(name))) {
            const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
            bad.push(`${file.slice(root.length + 1)}:${line + 1}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(bad).toEqual([]);
  });
});

// V21 · Kaynakta t('…') / tc('bağlam', '…') ile çevrilen literal anahtarları toplar.
// Kullanım: node scripts/i18n-keys.mjs [--missing]  → sözlükte olmayanları listeler.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) && !/\.test\./.test(f) && !p.includes(join('src', 'i18n', 'en')) ? [p] : [];
});
const unq = (q, body) => body.replace(new RegExp('\\\\' + q, 'g'), q).replace(/\\\\/g, '\\');
export function collectKeys(files = walk(join(root, 'src'))) {
  const out = new Map();
  const re = /(?<![\w.$])(t|tc)\(\s*(?:'([a-z]+)'\s*,\s*)?(['"])((?:\\.|(?!\3)[^\\])*)\3/g;
  for (const f of files) {
    const src = readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      const [, fn, ctx, q, body] = m;
      if (fn === 'tc' && !ctx) continue;
      const key = (ctx ? ctx + '|' : '') + unq(q, body);
      if (!out.has(key)) out.set(key, f.slice(root.length + 1));
    }
  }
  return out;
}
if (process.argv[1] && process.argv[1].endsWith('i18n-keys.mjs')) {
  const keys = collectKeys();
  console.log(JSON.stringify([...keys.keys()], null, 1));
}

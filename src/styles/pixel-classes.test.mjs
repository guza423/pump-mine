import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// pixel.css kuralları `.px .x` biçiminde yazılır. Aynı ada sahip global bir `.x` kuralı varsa,
// pixel.css'in yazmadığı özellikler (width, border-radius, bottom …) pixel ekranına sızar.
// V13'te `.sl` (Dashboard uyku düğmesi, 30 px) hareket listesini 30 px'e sıkıştırmıştı.
// (.mjs: Node API'si kullandığı için uygulamanın tsc denetimine girmez.)
const dir = resolve(process.cwd(), 'src/styles');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const selectors = (css) =>
  [...strip(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim()).filter((s) => s && !s.startsWith('@'));

function standaloneSubjects(css) {
  const out = new Set();
  for (const sel of selectors(css)) {
    for (const part of sel.split(',')) {
      const last = part.trim().split(/[\s>+~]+/).pop() || '';
      const compound = last.replace(/::?[\w-]+(\([^)]*\))?/g, '');
      const m = /^\.([\w-]+)$/.exec(compound);
      if (m) out.add(m[1]);
    }
  }
  return out;
}

function classesIn(css) {
  const out = new Set();
  for (const sel of selectors(css)) for (const m of sel.matchAll(/\.([a-zA-Z][\w-]*)/g)) out.add(m[1]);
  return out;
}

describe('pixel.css sınıfları', () => {
  it('global stillerde tek başına tanımlı bir sınıf adını kullanmaz', () => {
    const pixel = classesIn(readFileSync(resolve(dir, 'pixel.css'), 'utf8'));
    expect(pixel.size).toBeGreaterThan(50);
    const global = new Set();
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.css') && x !== 'pixel.css')) {
      standaloneSubjects(readFileSync(resolve(dir, f), 'utf8')).forEach((c) => global.add(c));
    }
    expect(global.has('sl')).toBe(true);
    const clash = [...pixel].filter((c) => c !== 'px' && global.has(c)).sort();
    expect(clash).toEqual([]);
  });
});

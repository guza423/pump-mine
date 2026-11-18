import React from 'react';
import { legalDoc } from './docs';
import './legal.css';

// Hukuki metinler için küçük, bağımlılıksız markdown okuyucu.
// Desteklenen: #/##/### başlık, paragraf (satır sonları korunur), "- " ve "1. " liste, "> " alıntı,
// | tablo | (telefonda okunur olsun diye satır kartları olarak çizilir), **kalın**, [bağlantı](url) ve [metin](#doc:id).

export type MdBlock =
  | { t: 'h1' | 'h2' | 'h3' | 'p' | 'quote'; text: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][] };

export function parseMd(md: string): MdBlock[] {
  const lines = md.split(/\r?\n/);
  const out: MdBlock[] = [];
  let para: string[] = [];
  let prevList: 'ul' | 'ol' | null = null;
  const flush = () => { if (para.length) { out.push({ t: 'p', text: para.join('\n') }); para = []; } };
  const cells = (row: string) => row.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m: RegExpExecArray | null;
    if (!line.trim()) { flush(); prevList = null; continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) { flush(); prevList = null; out.push({ t: ('h' + m[1].length) as 'h1', text: m[2].trim() }); continue; }
    if (/^\s*\|/.test(line)) {
      flush(); prevList = null;
      const rows: string[] = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
      i--;
      const body = rows.filter((r) => !/^\s*\|[\s|:-]+\|\s*$/.test(r)).map(cells);
      if (body.length) out.push({ t: 'table', head: body[0], rows: body.slice(1) });
      continue;
    }
    if ((m = /^>\s?(.*)$/.exec(line))) { flush(); prevList = null; out.push({ t: 'quote', text: m[1] }); continue; }
    const ul = /^\s*-\s+(.*)$/.exec(line);
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line);
    if (ul || ol) {
      flush();
      const kind = ul ? 'ul' : 'ol';
      const text = (ul || ol)![1];
      const last = out[out.length - 1];
      if (prevList === kind && last && last.t === kind) last.items.push(text);
      else out.push({ t: kind, items: [text] });
      prevList = kind;
      continue;
    }
    prevList = null;
    para.push(line.trim());
  }
  flush();
  return out;
}

type Open = (id: string) => void;

export function mdInline(text: string, onOpen?: Open): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<b key={k++}>{m[1]}</b>);
    else {
      const href = m[3];
      if (href.startsWith('#doc:')) {
        const id = href.slice(5);
        out.push(<a key={k++} className="lg-a" href={'#' + id} onClick={(e) => { if (onOpen) { e.preventDefault(); onOpen(id); } }}>{m[2]}</a>);
      } else {
        out.push(<a key={k++} className="lg-a" href={href} target="_blank" rel="noopener noreferrer">{m[2]}</a>);
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const withBreaks = (text: string, onOpen?: Open) =>
  text.split('\n').flatMap((ln, i) => (i ? [<br key={'br' + i} />, ...mdInline(ln, onOpen)] : mdInline(ln, onOpen)));

export function Markdown({ md, onOpen, hideTitle }: { md: string; onOpen?: Open; hideTitle?: boolean }) {
  const blocks = parseMd(md);
  return (
    <div className="lg-doc">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h1': return hideTitle ? null : <h1 key={i} className="lg-h1">{b.text}</h1>;
          case 'h2': return <h2 key={i} className="lg-h2">{mdInline(b.text, onOpen)}</h2>;
          case 'h3': return <h3 key={i} className="lg-h3">{mdInline(b.text, onOpen)}</h3>;
          case 'quote': return <blockquote key={i} className="lg-quote">{mdInline(b.text, onOpen)}</blockquote>;
          case 'ul': return <ul key={i} className="lg-ul">{b.items.map((it, j) => <li key={j}>{mdInline(it, onOpen)}</li>)}</ul>;
          case 'ol': return <ol key={i} className="lg-ol">{b.items.map((it, j) => <li key={j}>{mdInline(it, onOpen)}</li>)}</ol>;
          case 'table':
            return (
              <div key={i} className="lg-rows" role="table" aria-label={b.head.join(', ')}>
                {b.rows.map((r, j) => (
                  <div key={j} className="lg-row" role="row">
                    <b className="lg-row-t" role="rowheader">{mdInline(r[0] || '', onOpen)}</b>
                    {r.slice(1).map((c, n) => (
                      <p key={n} className="lg-row-c" role="cell"><span className="lg-row-k">{b.head[n + 1]}</span>{mdInline(c, onOpen)}</p>
                    ))}
                  </div>
                ))}
              </div>
            );
          default: return <p key={i} className="lg-p">{withBreaks(b.text, onOpen)}</p>;
        }
      })}
    </div>
  );
}

export function LegalDoc({ id, onOpen, hideTitle }: { id: string; onOpen?: Open; hideTitle?: boolean }) {
  return <Markdown md={legalDoc(id).md} onOpen={onOpen} hideTitle={hideTitle} />;
}

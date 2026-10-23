// @ts-nocheck
import React from 'react';

function NoteIcon({ name }) {
  const props = { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' };
  if (name === 'pulse') return <svg {...props}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>;
  if (name === 'target') return <svg {...props}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
  return <svg {...props}><path d="M9 3h6" /><path d="M10 3v6L4.6 18.8A1.5 1.5 0 0 0 5.9 21h12.2a1.5 1.5 0 0 0 1.3-2.2L14 9V3" /><path d="M7.5 15h9" /></svg>;
}

function Notes({ what, tip, caveat }) {
  return (
    <aside className="notes">
      <div className="note note-what">
        <div className="note-label"><NoteIcon name="pulse" /> Ne oluyor?</div>
        <p>{what}</p>
      </div>
      <div className="note note-tip">
        <div className="note-label"><NoteIcon name="target" /> Pratik ipucu</div>
        <p>{tip}</p>
      </div>
      {caveat ? (
        <div className="note note-caveat">
          <div className="note-label"><NoteIcon name="flask" /> Bilimsel not</div>
          <p>{caveat}</p>
        </div>
      ) : null}
    </aside>
  );
}

function Tile({ k, v, unit, sub, tone }) {
  return (
    <div className={'tile ' + (tone || '')}>
      <span className="tile-k">{k}</span>
      <span className="tile-v mono">{v}<small>{unit}</small></span>
      {sub ? <span className="tile-sub">{sub}</span> : null}
    </div>
  );
}

export { Notes, Tile };

// V24 · Çevrilen metinde vurgu: **kalın** parçalar <b> olur. Anahtar ve İngilizce değer aynı işaretleri taşır.
import React from 'react';

export function rich(s: string): React.ReactNode[] {
  return String(s).split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <React.Fragment key={i}>{part}</React.Fragment>));
}

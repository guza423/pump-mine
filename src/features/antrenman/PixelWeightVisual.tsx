import React from 'react';
import { computeBarPlates, fk, PL_COLORS, PL_DIM, type VisKind } from './pixelHelpers';
import { t } from '../../i18n';

interface Props {
  vis: VisKind;
  eq?: string;
  kg: number;
  kgPop: string;
  itemName: string;
}

export const PixelWeightVisual: React.FC<Props> = ({ vis, eq, kg, kgPop, itemName }) => {
  const kgTxt = fk(kg);

  if (vis === 'mk') {
    const plateN = 20;
    const pinNo = Math.min(plateN, Math.max(0, Math.round(kg / 5)));
    const pinY = 12 + Math.max(0, pinNo - 1) * 6;
    const extra = kg > 100 ? kg - 100 : 0;
    return (
      <div className="px-vis">
        <div className="px-vis-mk">
          <div className="px-vis-mk-rack" aria-hidden="true">
            <i style={{ position: 'absolute', left: 10, top: 0, width: 100, height: 4, background: 'var(--bar)' }} />
            <i style={{ position: 'absolute', left: 14, top: 4, width: 3, height: 130, background: 'var(--ln)' }} />
            <i style={{ position: 'absolute', left: 103, top: 4, width: 3, height: 130, background: 'var(--ln)' }} />
            <i style={{ position: 'absolute', left: 59, top: 4, width: 2, height: pinY, background: 'var(--barH)' }} />
            {Array.from({ length: plateN }, (_, i) => (
              <i key={i} className={'mp' + (i < pinNo ? ' on' : '')} style={{ top: 12 + i * 6 }} />
            ))}
            {pinNo > 0 ? (
              <div className={'pin ' + kgPop} style={{ top: pinY }}>
                <i style={{ position: 'absolute', left: 0, top: 0, width: 58, height: 4, background: 'var(--gold)' }} />
                <i style={{ position: 'absolute', left: 56, top: -3, width: 8, height: 10, background: 'var(--gold)' }} />
              </div>
            ) : null}
          </div>
          <div className="px-vis-mk-info">
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
              <span className={'num px-vis-num ' + kgPop} style={{ transformOrigin: '0 100%' }}>{kgTxt}</span>
              <span className="nm px-vis-unit">KG</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--gold)' }}>
              {pinNo > 0 ? t('pim: {n}. plaka', { n: pinNo }) : t('yüksüz')}
              {extra > 0 ? ` · +${fk(extra)} kg` : ''}
            </div>
            <div style={{ fontSize: 13, color: 'var(--mt)' }}>{t('20 plaka × 5 kg')}</div>
          </div>
        </div>
      </div>
    );
  }

  const plates = vis === 'bar' ? computeBarPlates(kg) : [];
  const nDisc = Math.min(6, 1 + Math.floor(kg / 8));
  const dH = Math.round(30 + Math.min(1, kg / 50) * 34);
  const dbCap = dH - 12;

  const sideTxt =
    vis === 'bar'
      ? t('taraf başına: {x}', { x: plates.length ? plates.map((p) => fk(p)).join(' + ') : kg < 20 ? t('bar ağırlığının altında') : t('boş bar') })
      : vis === 'db'
        ? itemName.startsWith('Tek ')
          ? t('tek el')
          : t('tek el · iki dambıl toplam {x} kg', { x: fk(kg * 2) })
        : eq === 'bw'
          ? t('ek yük')
          : '';

  return (
    <div className="px-vis">
      {vis === 'bar' ? (
        <div className="px-vis-bar" aria-hidden="true">
          <div className="px-vis-shaft" />
          <div className="px-vis-knurl" />
          <div className="px-vis-collar-l" />
          <div className="px-vis-collar-r" />
          <div className="px-vis-plates-l">
            {plates.map((p, i) => (
              <i
                key={i}
                className={'px-plate ' + (i === plates.length - 1 ? kgPop : '')}
                style={{ width: PL_DIM[p][0], height: PL_DIM[p][1], background: PL_COLORS[p] }}
              />
            ))}
          </div>
          <div className="px-vis-plates-r">
            {plates.map((p, i) => (
              <i
                key={i}
                className={'px-plate ' + (i === plates.length - 1 ? kgPop : '')}
                style={{ width: PL_DIM[p][0], height: PL_DIM[p][1], background: PL_COLORS[p] }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {vis === 'db' ? (
        <div className="px-vis-db" aria-hidden="true">
          <div className="px-vis-db-side left">
            {Array.from({ length: nDisc }, (_, i) => (
              <i
                key={i}
                className={'px-plate ' + (i === nDisc - 1 ? kgPop : '')}
                style={{ width: 9, height: dH, background: 'var(--barH)' }}
              />
            ))}
            <i className="px-vis-db-cap" style={{ display: 'block', width: 5, height: dbCap, background: 'var(--bar)' }} />
          </div>
          <div className="px-vis-db-handle" />
          <div className="px-vis-db-side">
            {Array.from({ length: nDisc }, (_, i) => (
              <i
                key={i}
                className={'px-plate ' + (i === nDisc - 1 ? kgPop : '')}
                style={{ width: 9, height: dH, background: 'var(--barH)' }}
              />
            ))}
            <i className="px-vis-db-cap" style={{ display: 'block', width: 5, height: dbCap, background: 'var(--bar)' }} />
          </div>
        </div>
      ) : null}

      <div className="px-vis-num-row">
        <span className={'num px-vis-num ' + kgPop}>{kgTxt}</span>
        <span className="nm px-vis-unit">KG</span>
      </div>
      {sideTxt ? <div className="px-vis-sub">{sideTxt}</div> : <div className="px-vis-sub" />}
    </div>
  );
};

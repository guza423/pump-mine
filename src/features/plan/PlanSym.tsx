import React from 'react';
import { symbolPath, type PlanSymbol } from './planSymbols';

/** V38 · Antrenman çeşidi sembolü (8×8 pixel). hollow: planlanan, henüz yapılmamış. */
export function PlanSym({ sym, hollow = false, size = 10, className = '' }: { sym: PlanSymbol; hollow?: boolean; size?: number; className?: string }) {
  return (
    <svg
      className={'psym ' + className}
      width={size}
      height={size}
      viewBox="0 0 8 8"
      shapeRendering="crispEdges"
      aria-hidden="true"
      data-shape={sym.shape}
      data-hollow={hollow ? '1' : undefined}
    >
      <path d={symbolPath(sym.shape, hollow)} fill={sym.color} />
    </svg>
  );
}

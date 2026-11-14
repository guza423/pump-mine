// @ts-nocheck
// Eski Hipertrofi bloğu yalnızca model ve ekran testleri için korunur.
import { libById, newId, clone } from '../features/antrenman/core';

function tItem(exId, sets, repMin, repMax, kg, rpeMin, rpeMax, rest, note) {
  const ex = libById(exId);
  return { exId, name: ex.name, muscle: ex.muscle, sets, repMin, repMax, kg, rpeMin, rpeMax, rest: rest || ex.rest, note: note || '' };
}

export function hipertrofiProgram() {
  const days = [
      { name: 'Pump günü', weekday: 2, items: [tItem('egimli-bench', 5, 8, 12, 60, 6, 7, 120), tItem('rdl', 3, 8, 10, null, 7, 8), tItem('db-omuz-press', 3, 10, 12, null, 6, 7), tItem('shrug', 2, 12, 15, null, null, null), tItem('leg-curl', 2, 10, 12, null, null, null), tItem('boyun', 2, 15, 20, null, null, null)] },
      { name: 'Ağır gün', weekday: 4, items: [tItem('egimli-bench', 2, 5, 8, 75, 9, 10, 240, 'Ağır setler'), tItem('db-omuz-press', 3, 8, 12, null, 7, 8), tItem('egimli-bench', 5, 8, 12, 65, 8, 8, 150, 'Hacim setleri'), tItem('shrug', 2, 10, 15, null, 9, 10), tItem('rdl', 1, 8, 10, null, 6, 7), tItem('leg-curl', 3, 8, 12, null, 9, 10), tItem('boyun', 2, 15, 20, null, 5, 6)] },
      { name: 'Ev · band', weekday: 6, items: [tItem('band-leg-curl', 3, 12, 20, null, 8, 9), tItem('band-yana-acis', 3, 15, 25, null, 8, 9)] },
    ];
  const now = Date.now();
  return { id: newId('p'), name: 'Hipertrofi bloğu', createdAt: now, updatedAt: now, days: days.map(d => ({ ...d, id: newId('d'), items: d.items.map(i => ({ ...clone(i), id: newId('i') })) })) };
}

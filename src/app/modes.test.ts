import { describe, expect, it } from 'vitest';
import { screenMode, tabTransition } from './modes';

describe('V36 · ekran modları', () => {
  it('sekmeye ve idman durumuna göre mod seçer', () => {
    expect(screenMode({ tab: 'bugun' })).toBe('sakin');
    expect(screenMode({ tab: 'gozlem', active: {} })).toBe('sakin');
    expect(screenMode({ tab: 'lab', active: {} })).toBe('lab');
    expect(screenMode({ tab: 'antrenman' })).toBe('isinma');
    expect(screenMode({ tab: 'antrenman', active: { ready: true } })).toBe('isinma');
    expect(screenMode({ tab: 'antrenman', active: {} })).toBe('idman');
    expect(screenMode({ tab: 'antrenman', summary: true })).toBe('sakin');
    expect(screenMode({ tab: 'antrenman', active: {}, editing: true })).toBe('sakin');
  });

  it('sekme geçişini seçer', () => {
    expect(tabTransition('bugun', 'bugun', true)).toBeNull();
    expect(tabTransition('bugun', 'antrenman', true)).toBe('into');
    expect(tabTransition('bugun', 'antrenman', false)).toBe('warm');
    expect(tabTransition('antrenman', 'lab', true)).toBe('out');
    expect(tabTransition('antrenman', 'lab', false)).toBeNull();
    expect(tabTransition('bugun', 'lab', true)).toBeNull();
  });
});

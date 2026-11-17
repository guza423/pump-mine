import type { FxSettings, Setting } from '../store/types';

export function readFxSettings(settings: Setting[] = []): FxSettings {
  const raw = settings.find((x) => x.key === 'fx')?.value as Partial<FxSettings> | undefined;
  return {
    sound: raw?.sound ?? true,
    haptic: raw?.haptic ?? true,
  };
}

class PixelFxEngine {
  private ac: AudioContext | null = null;

  unlock(fx: FxSettings) {
    if (!fx.sound) return;
    try {
      if (!this.ac) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AC) this.ac = new AC();
      }
      if (this.ac && this.ac.state === 'suspended') {
        void this.ac.resume().catch(() => {});
      }
    } catch {
      /* ses açılamazsa sessizce geç */
    }
  }

  blip(fx: FxSettings, freq: number, dur: number, type: OscillatorType = 'square', vol = 0.04, delay = 0) {
    if (!fx.sound || !this.ac) return;
    try {
      const ac = this.ac;
      const t = ac.currentTime + delay;
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(t);
      osc.stop(t + dur + 0.03);
    } catch {
      /* ses çalınamazsa sessizce geç */
    }
  }

  buzz(fx: FxSettings, pattern: number | number[]) {
    if (!fx.haptic) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch {
      /* titreşim desteklenmiyorsa geç */
    }
  }

  enterEx(fx: FxSettings) {
    this.unlock(fx);
    this.blip(fx, 523, 0.05, 'square', 0.04);
    this.blip(fx, 784, 0.06, 'square', 0.04, 0.06);
    this.buzz(fx, 8);
  }

  goList(fx: FxSettings) {
    this.blip(fx, 440, 0.04, 'square', 0.035);
  }

  goPick(fx: FxSettings) {
    this.unlock(fx);
    this.blip(fx, 587, 0.04, 'square', 0.035);
  }

  pickBack(fx: FxSettings) {
    this.blip(fx, 440, 0.04, 'square', 0.035);
  }

  startSes(fx: FxSettings) {
    this.unlock(fx);
    [392, 523, 659, 784].forEach((f, k) => this.blip(fx, f, 0.08, 'square', 0.05, k * 0.08));
    this.buzz(fx, [20, 40, 20]);
  }

  autoStart(fx: FxSettings) {
    this.unlock(fx);
    [392, 523, 659].forEach((f, k) => this.blip(fx, f, 0.07, 'square', 0.045, 0.25 + k * 0.07));
  }

  endSes(fx: FxSettings) {
    this.unlock(fx);
    [784, 659, 523, 784, 1047].forEach((f, k) => this.blip(fx, f, 0.1, 'square', 0.05, k * 0.09));
    this.buzz(fx, [30, 50, 30, 50, 60]);
  }

  togglePick(fx: FxSettings, wasOn: boolean) {
    this.unlock(fx);
    this.blip(fx, wasOn ? 392 : 659, 0.04, 'square', 0.035);
    this.buzz(fx, 6);
  }

  addPicked(fx: FxSettings) {
    [523, 659, 784].forEach((f, k) => this.blip(fx, f, 0.07, 'square', 0.045, k * 0.07));
    this.buzz(fx, [10, 30, 10]);
  }

  openSel(fx: FxSettings) {
    this.unlock(fx);
    this.blip(fx, 587, 0.04, 'square', 0.035);
    this.buzz(fx, 6);
  }

  closeSel(fx: FxSettings) {
    this.blip(fx, 392, 0.04, 'square', 0.03);
  }

  setRom(fx: FxSettings, n: number) {
    this.blip(fx, 220 + n * 4.4, 0.04, 'square', 0.035);
    this.buzz(fx, n === 100 ? 12 : 5);
  }

  setKg(fx: FxSettings, nk: number, step: number) {
    const maj = nk % 10 === 0;
    const n = Math.round(nk / step);
    const semis = [0, 2, 4, 7, 9][n % 5] + 12 * (Math.floor(n / 5) % 3);
    this.blip(fx, 262 * Math.pow(2, semis / 12), maj ? 0.08 : 0.04, 'square', maj ? 0.06 : 0.035);
    if (maj) this.blip(fx, 262 * Math.pow(2, (semis + 12) / 12), 0.06, 'square', 0.035, 0.05);
    this.buzz(fx, maj ? 14 : 5);
  }

  setReps(fx: FxSettings, n: number) {
    const five = n % 5 === 0;
    const semis = [0, 2, 4, 7, 9][(n - 1) % 5] + 12 * (Math.floor((n - 1) / 5) % 3);
    this.blip(fx, 330 * Math.pow(2, semis / 12), five ? 0.07 : 0.04, 'square', five ? 0.055 : 0.035);
    this.buzz(fx, five ? 12 : 5);
  }

  setLvl(fx: FxSettings, l: number) {
    const grind = l === 4;
    this.blip(fx, [660, 523, 440, 330, 150][l], grind ? 0.18 : 0.06, grind ? 'sawtooth' : 'square', 0.05);
    this.buzz(fx, grind ? [18, 30, 18] : 7);
  }

  logSet(fx: FxSettings) {
    this.unlock(fx);
    [523, 659, 784, 1047].forEach((f, i) => this.blip(fx, f, 0.09, 'square', 0.05, i * 0.075));
    this.buzz(fx, [12, 40, 24]);
  }

  skipRest(fx: FxSettings) {
    this.blip(fx, 392, 0.05, 'square', 0.04);
  }

  hideRest(fx: FxSettings) {
    this.blip(fx, 440, 0.04, 'square', 0.035);
  }

  openRest(fx: FxSettings) {
    this.unlock(fx);
    this.blip(fx, 523, 0.04, 'square', 0.035);
  }

  addRest(fx: FxSettings, delta: number) {
    this.blip(fx, delta > 0 ? 659 : 392, 0.05, 'square', 0.045);
    this.buzz(fx, 8);
  }

  chime(fx: FxSettings) {
    [784, 988, 1175].forEach((f, i) => this.blip(fx, f, 0.12, 'square', 0.05, i * 0.12));
    this.buzz(fx, [30, 60, 30]);
  }
}

export const pixelFx = new PixelFxEngine();

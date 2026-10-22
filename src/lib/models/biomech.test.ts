import { describe, expect, it } from 'vitest';
import { BIO } from './biomech';

describe('eğimli bench biyomekanik modeli', () => {
  it('30°, orta tutuş ve bar göğüsteyken omuz moment kolunu korur', () => {
    const pose = BIO.benchPose(
      { angle: 30, grip: 'orta', flare: 'orta', load: 80 },
      0,
    );
    expect(pose.dS).toBeCloseTo(14.4, 1);
  });

  it('yük arttığında aynı konumdaki omuz torkunu artırır', () => {
    const light = BIO.benchPose({ angle: 30, grip: 'orta', flare: 'orta', load: 60 }, 0.3);
    const heavy = BIO.benchPose({ angle: 30, grip: 'orta', flare: 'orta', load: 100 }, 0.3);
    expect(heavy.mS).toBeGreaterThan(light.mS);
  });
});

describe('RDL ve yana açış modelleri', () => {
  it('RDL eğrisinde tanımlı sayıda örnek üretir', () => {
    expect(BIO.rdlCurve({ load: 80, offset: 0, knee: 20, depth: 70 }, 60)).toHaveLength(61);
  });

  it('dumbbell yana açış momentini kol yükseldikçe artırır', () => {
    const params = { mass: 10, bend: 15, kind: 'db', bandSide: 'ayni' };
    expect(BIO.latPose(params, 1, 'db').m).toBeGreaterThan(BIO.latPose(params, 0, 'db').m);
  });
});

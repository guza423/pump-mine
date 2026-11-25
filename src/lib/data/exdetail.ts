/* ================= AYRINTILI KASLAR (V39) =================
   İki katman: 19 kas grubu (MUS_CODE) aynı kalır; kayıtlar, haftalık set ve hedefler onlarla çalışır.
   Altında 52 ayrıntılı kas var. Bir zor set ayrıntıya şöyle sayılır: grubun payı (exShare: 1, ½, ¼) × ayrıntı ağırlığı.
   Ağırlık o bölgenin hareketteki payıdır (1 = asıl çalışan, .5 = ikinci, .25 = az); ağırlıklar toplanıp 1 etmez,
   aynı seti farklı bölgelerin ne kadar aldığını gösterir. Grubu harekette yoksa (ör. leg raise'te kalça fleksörü)
   taban 1 (ana kas) alınır.
   Kurallar hareketin İngilizce adından (regex) çıkar; kurala uymayan hareket DET_BY_ID ile elle yazılır.
   Kaynaklar: üst göğüs eğimli press (Chaves ve ark. 2024, 30° eğim), triceps uzun baş baş üstü uzunken (Maeo ve ark. 2023),
   oturarak leg curl hamstring (Maeo ve ark. 2021), nordic semitendinosus, diz bükük baldır soleus, kalça abduksiyon
   gluteus medius/minimus ve TFL; kalça içe rotasyonu gluteus medius/minimus ön lifleri ve TFL. */
import { MUS_CODE, exShare, type LibraryExercise } from './exlib';
import { byLang } from '../../i18n';

type G = keyof typeof MUS_CODE;
// kod → [Türkçe, İngilizce, grup]
const DET_RAW: Record<string, [string, string, G]> = {
  GU: ['Üst göğüs (klaviküler)', 'Upper chest (clavicular)', 'G'],
  GO: ['Orta göğüs (sternal)', 'Mid chest (sternal)', 'G'],
  GA: ['Alt göğüs (abdominal)', 'Lower chest (abdominal)', 'G'],
  PM: ['Küçük göğüs kası', 'Pec minor', 'G'],
  SA: ['Serratus anterior', 'Serratus anterior', 'G'],
  ODO: ['Ön deltoid', 'Front delt', 'OO'],
  SSC: ['Subskapularis (iç rotator)', 'Subscapularis (internal rotator)', 'OO'],
  ODY: ['Yan deltoid', 'Side delt', 'OY'],
  SSP: ['Supraspinatus', 'Supraspinatus', 'OY'],
  ODA: ['Arka deltoid', 'Rear delt', 'OA'],
  RC: ['Dış rotatorlar (infraspinatus, teres minor)', 'External rotators (infraspinatus, teres minor)', 'OA'],
  LAT: ['Latissimus dorsi', 'Latissimus dorsi', 'S'],
  TM: ['Teres major', 'Teres major', 'S'],
  ROM: ['Romboidler', 'Rhomboids', 'S'],
  TU: ['Üst trapez', 'Upper traps', 'T'],
  TO: ['Orta trapez', 'Mid traps', 'T'],
  TAL: ['Alt trapez', 'Lower traps', 'T'],
  LS: ['Levator scapulae', 'Levator scapulae', 'T'],
  ES: ['Bel dikleştiricileri (erector spinae)', 'Spinal erectors', 'B'],
  QL: ['Quadratus lumborum', 'Quadratus lumborum', 'B'],
  BIU: ['Biceps uzun baş', 'Biceps long head', 'BI'],
  BIK: ['Biceps kısa baş', 'Biceps short head', 'BI'],
  BRA: ['Brachialis', 'Brachialis', 'BI'],
  TRU: ['Triceps uzun baş', 'Triceps long head', 'TR'],
  TRY: ['Triceps lateral ve medial baş', 'Triceps lateral and medial heads', 'TR'],
  BRR: ['Brachioradialis', 'Brachioradialis', 'OK'],
  OKF: ['Bilek ve parmak fleksörleri (kavrama)', 'Wrist and finger flexors (grip)', 'OK'],
  OKE: ['Bilek ve parmak ekstansörleri', 'Wrist and finger extensors', 'OK'],
  PS: ['Pronator ve supinatörler', 'Pronators and supinators', 'OK'],
  RA: ['Düz karın (rectus abdominis)', 'Rectus abdominis', 'K'],
  OBL: ['Oblikler', 'Obliques', 'K'],
  TVA: ['Transversus abdominis (derin karın)', 'Transversus abdominis', 'K'],
  RF: ['Rectus femoris', 'Rectus femoris', 'Q'],
  VL: ['Vastus lateralis', 'Vastus lateralis', 'Q'],
  VM: ['Vastus medialis', 'Vastus medialis', 'Q'],
  HF: ['Kalça fleksörleri (iliopsoas)', 'Hip flexors (iliopsoas)', 'Q'],
  BFU: ['Biceps femoris uzun baş', 'Biceps femoris long head', 'H'],
  BFK: ['Biceps femoris kısa baş', 'Biceps femoris short head', 'H'],
  SM: ['Semitendinosus ve semimembranosus', 'Semitendinosus and semimembranosus', 'H'],
  GMX: ['Gluteus maximus', 'Gluteus maximus', 'KA'],
  GMD: ['Gluteus medius ve minimus', 'Gluteus medius and minimus', 'KA'],
  TFL: ['Tensor fasciae latae (TFL)', 'Tensor fasciae latae (TFL)', 'KA'],
  DR: ['Derin dış rotatorlar (piriformis vb.)', 'Deep hip rotators (piriformis etc.)', 'KA'],
  ADM: ['Adductor magnus', 'Adductor magnus', 'AD'],
  ADL: ['Adductor longus, brevis ve gracilis', 'Adductor longus, brevis and gracilis', 'AD'],
  GAS: ['Gastroknemius', 'Gastrocnemius', 'BA'],
  SOL: ['Soleus', 'Soleus', 'BA'],
  TIA: ['Tibialis anterior', 'Tibialis anterior', 'TI'],
  PER: ['Peroneuslar (fibularis)', 'Peroneals (fibularis)', 'TI'],
  SCM: ['Sternokleidomastoid (boyun ön ve yan)', 'Sternocleidomastoid (front and side of neck)', 'BO'],
  BOE: ['Boyun ekstansörleri (splenius)', 'Neck extensors (splenius)', 'BO'],
  BDF: ['Derin boyun fleksörleri', 'Deep neck flexors', 'BO'],
};
/** Ayrıntılı kas kodu → { tr (veri adı), group (grup adı, Türkçe veri) }. Gösterim adı detName(). */
const DET = Object.fromEntries(Object.entries(DET_RAW).map(([c, [tr, , g]]) => [c, { tr, group: MUS_CODE[g] }])) as Record<string, { tr: string; group: string }>;
const DET_LABEL = byLang('musdet', {
  tr: Object.fromEntries(Object.entries(DET_RAW).map(([c, [tr]]) => [c, tr])),
  en: Object.fromEntries(Object.entries(DET_RAW).map(([c, [, en]]) => [c, en])),
});
const detName = (code: string) => DET_LABEL[code] || code;
/** Grup adı (Türkçe veri) → o grubun ayrıntılı kas kodları (sırayla). */
const DET_BY_GROUP: Record<string, string[]> = {};
Object.entries(DET).forEach(([c, d]) => { (DET_BY_GROUP[d.group] ||= []).push(c); });

const CODE_OF = Object.fromEntries(Object.entries(MUS_CODE).map(([c, n]) => [n, c])) as Record<string, G>;

/* Grup başına kural: hareketin İngilizce adı (küçük harf) → 'KOD' ya da 'KOD:ağırlık' listesi. İlk eşleşen geçerli. */
type Rule = [RegExp, string];
const RULES: Partial<Record<G, { r: Rule[]; d: string }>> = {
  G: {
    r: [
      [/push-up plus|supine dumbbell punch/, 'SA,GO:.25'],
      [/incline|low-to-high|guillotine|reverse-grip|landmine/, 'GU,GO:.5'],
      [/decline|dip|high-to-low/, 'GA,GO:.5'],
      [/pullover/, 'GO,GA:.5'],
      [/push-up|punch|shot put|chest pass|chest throw|sprawl|burpee|man maker|devil/, 'GO,GU:.5,GA:.5,SA:.5'],
    ],
    d: 'GO,GU:.5,GA:.5',
  },
  OO: { r: [[/internal rotation/, 'SSC']], d: 'ODO' },
  OY: { r: [[/scaption/, 'SSP,ODY:.5'], [/lateral raise|y-raise|lu raise/, 'ODY,SSP:.25']], d: 'ODY' },
  OA: { r: [[/external rotation|90\/90|cuban/, 'RC,ODA:.25'], [/face pull|ytw|w-raise|pull-apart|dislocate/, 'ODA,RC:.5']], d: 'ODA' },
  S: {
    r: [
      [/straight-arm|pullover/, 'LAT,TM'],
      [/pull-?up|pulldown|chin-up|muscle-up|lever|climb|skin the cat|rope pull/, 'LAT,TM:.5,ROM:.25'],
      [/row|renegade|arm drag/, 'ROM,LAT,TM:.5'],
    ],
    d: 'LAT,ROM:.5',
  },
  T: {
    r: [
      [/y-raise|trap-3|scapular|lu raise|handstand|planche/, 'TAL,TU:.5'],
      [/row|rear delt|face pull|pull-apart|t-raise|w-raise|ytw|reverse fly|reverse pec|kelso/, 'TO,TAL:.5'],
      [/clean|snatch|high pull|jerk|jump shrug/, 'TU,TO:.5'],
      [/shrug|upright/, 'TU,LS:.25'],
    ],
    d: 'TU,TO:.25',
  },
  B: { r: [[/side bend|suitcase|windmill/, 'QL,ES:.5']], d: 'ES' },
  BI: {
    r: [
      [/hammer|reverse curl|zottman|cross-body/, 'BRA,BIU:.5'],
      [/preacher|spider|concentration|lying cable curl/, 'BIK,BRA:.5'],
      [/incline|bayesian|drag curl/, 'BIU,BIK:.5'],
      [/curl/, 'BIU,BIK,BRA:.5'],
    ],
    d: 'BRA,BIU:.5,BIK:.5',
  },
  TR: { r: [[/overhead|skull|lying|tate|katana|jm press|pullover|extension|cross-body|straight-arm/, 'TRU,TRY:.5']], d: 'TRY,TRU:.5' },
  OK: {
    r: [
      [/reverse wrist|finger extension/, 'OKE'],
      [/reverse curl|hammer|zottman|radial|ulnar/, 'BRR,OKE:.5'],
      [/pronation|wrist roller/, 'PS,OKF:.5,OKE:.5'],
    ],
    d: 'OKF',
  },
  K: {
    r: [
      [/vacuum/, 'TVA'],
      [/twist|woodchop|rotation|rotational|pallof|wiper|bicycle|side|oblique|windmill|lift|hook|flag|suitcase|hip heist|sit-out|shrimp|granby/, 'OBL,RA:.5,TVA:.25'],
      [/leg raise|knee raise|toes to bar|v-up|v-sit|dragon|l-sit|hollow|jackknife|reverse crunch|pike|captain|mountain|hip flexion|psoas/, 'RA,HF:.5'],
      [/plank|dead bug|rollout|wheel|body saw|stir|bird dog|crawl|carry|inchworm|taps|renegade|front squat|zercher/, 'RA,TVA:.5,OBL:.5'],
    ],
    d: 'RA',
  },
  Q: {
    r: [
      [/hip flexion|psoas/, 'HF,RF:.5'],
      [/leg extension|sissy|reverse nordic|spanish/, 'RF,VL:.5,VM:.5'],
      [/step-down|poliquin|cyclist|heels-elevated|atg|wall sit/, 'VM,VL:.5,RF:.25'],
      [/jump|hop|bound|skip|sprint|knees|shot|stance|bag|sparring|wrestling|footwork|slip|kick|mountain|crawl|burpee/, 'VL,VM:.5,RF:.5,HF:.25'],
    ],
    d: 'VL,VM,RF:.25',
  },
  H: {
    r: [
      [/seated leg curl/, 'SM,BFU,BFK:.5'],
      [/nordic|razor|glute-ham/, 'SM,BFU:.5,BFK:.5'],
      [/curl|walkout|hamstring bridge/, 'BFK,SM,BFU:.5'],
      [/sprint|bound|skip|kick/, 'BFU,SM:.5'],
    ],
    d: 'BFU,SM,BFK:.25',
  },
  KA: {
    r: [
      [/hip internal/, 'GMD,TFL'],
      [/hip external/, 'DR,GMX:.5'],
      [/abduction|clamshell|lateral band|band walk|side-lying leg|fire hydrant|curtsy|airplane|side plank/, 'GMD,TFL:.5'],
      [/single-leg|step-up|lunge|split|pistol|skater|lateral|cossack|bound|hop|b-stance/, 'GMX,GMD:.5'],
    ],
    d: 'GMX',
  },
  AD: { r: [[/adduction|copenhagen|squeeze|slide|lateral|criss|star|four-square|hexagon/, 'ADL,ADM:.5']], d: 'ADM,ADL:.5' },
  BA: { r: [[/seated|bent-knee/, 'SOL'], [/hop|pogo|jump|rope|skip|sprint|bound|tiptoe|footwork|double under|four-square|hexagon/, 'SOL,GAS']], d: 'GAS,SOL:.5' },
  TI: { r: [[/eversion/, 'PER']], d: 'TIA' },
  BO: {
    r: [
      [/chin tuck/, 'BDF,SCM:.25'],
      [/flexion|front bridge|headstand/, 'SCM,BDF:.5'],
      [/lateral|rotation|turnover/, 'SCM,BOE:.5'],
      [/extension|harness|back bridge|quadruped/, 'BOE'],
    ],
    d: 'SCM,BOE,BDF:.5',
  },
};
/** Kurala uymayan hareketler: grup kodu → ayrıntı listesi (yalnız yazılan gruplar değişir). */
const DET_BY_ID: Record<string, Partial<Record<G, string>>> = {
  'egimli-bench': { G: 'GU,GO:.5' },
  'dar-bench': { G: 'GO,GU:.5' },
  'kablo-crossover': { G: 'GA,GO:.5' },
  'hex-press': { G: 'GO,GU:.5' },
  'svend-press': { G: 'GO,GU:.5' },
  'yan-plank': { K: 'OBL,TVA:.5' },
  'copenhagen-plank': { AD: 'ADL,ADM:.5', K: 'OBL' },
  'kisa-copenhagen': { K: 'OBL' },
  'ciftci-yuruyusu': { OK: 'OKF', T: 'TU,LS:.25' },
  'dead-hang': { S: 'LAT,TM:.5' },
  'plaka-sikistirma': { OK: 'OKF' },
  'tibialis-raise': { TI: 'TIA' },
  'kalca-ucagi': { KA: 'GMD,DR,GMX:.5' },
  'kablo-ice-rotasyon': { OO: 'SSC' },
  'bant-ice-rotasyon': { OO: 'SSC' },
  'kablo-disa-rotasyon': { OA: 'RC,ODA:.25' },
  'yan-yatarak-disa-rotasyon': { OA: 'RC,ODA:.25' },
  'ip-atlama': { BA: 'GAS,SOL' },
  'cift-gecis': { BA: 'GAS,SOL' },
  'jefferson-curl': { B: 'ES' },
  'good-morning': { H: 'BFU,SM' },
  'karin-vakumu': { K: 'TVA' },
  // hammer tutuşunda brachioradialis büyük pay alır (ön kol dengeleyici ¼ × 2 = ½)
  'hammer-curl': { OK: 'BRR:2' },
  'capraz-hammer-curl': { OK: 'BRR:2' },
  'halat-hammer-curl': { OK: 'BRR:2' },
  'egimli-hammer': { OK: 'BRR:2' },
  'zottman-curl': { OK: 'BRR:2,OKE:.5' },
};

function parse(spec: string): [string, number][] {
  return spec.split(',').filter(Boolean).map((p) => { const [c, w] = p.split(':'); return [c, w != null ? Number(w) : 1]; });
}
const SPEC_CACHE = new Map<string, [string, number][]>();
/** Bir hareketin ayrıntılı kas payları: [[ayrıntı kodu, set payı], …] (büyükten küçüğe). Kütüphane dışı harekette boş. */
function exDetail(ex: Pick<LibraryExercise, 'id' | 'muscle' | 'en'> | null | undefined): [string, number][] {
  if (!ex || !ex.id) return [];
  const hit = SPEC_CACHE.get(ex.id);
  if (hit) return hit;
  const en = String(ex.en || '').toLowerCase();
  const out = new Map<string, number>();
  const shares = exShare(ex);
  const present = new Map(shares.map(([m, f]) => [CODE_OF[m], f]));
  shares.forEach(([m]) => {
    const g = CODE_OF[m];
    const rule = RULES[g];
    if (!rule) return;
    const spec = DET_BY_ID[ex.id]?.[g] ?? (rule.r.find(([re]) => re.test(en))?.[1] ?? rule.d);
    parse(spec).forEach(([c, w]) => {
      const d = DET[c];
      if (!d) return;
      const base = present.get(CODE_OF[d.group]) ?? 1;
      out.set(c, Math.max(out.get(c) || 0, base * w));
    });
  });
  // ¼ setin altı gösterilmez ve sayılmaz (çok küçük paylar listeyi kalabalıklaştırır)
  const list = [...out.entries()].filter(([, f]) => f >= 0.25).sort((a, b) => b[1] - a[1]);
  SPEC_CACHE.set(ex.id, list);
  return list;
}
/** Kas ayrıntısı tablosuna n zor set ekler (kod → set). */
function addDetail(map: Record<string, number>, ex: Pick<LibraryExercise, 'id' | 'muscle' | 'en'> | null | undefined, n: number) {
  if (!n) return;
  for (const [c, f] of exDetail(ex)) map[c] = (map[c] || 0) + n * f;
}
/** Arama için ayrıntılı kas adları (Türkçe + İngilizce). */
const detailSearch = (ex: Pick<LibraryExercise, 'id' | 'muscle' | 'en'>) => exDetail(ex).map(([c]) => DET_RAW[c][0] + ' ' + DET_RAW[c][1]).join(' ');

export { DET, DET_BY_GROUP, detName, exDetail, addDetail, detailSearch };

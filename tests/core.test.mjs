// Τεστ της λογικής με «ψεύτικη» πίστα και ψεύτικο GPS (με θόρυβο).
import assert from 'node:assert/strict';
import { unproject, project, dist } from '../src/core/geo.js';
import { MappingRecorder, buildTrackShape } from '../src/core/mapping.js';
import { makeLineAt, orderSectors, checkpoints, findLineNear } from '../src/core/lines.js';
import { LapTimer, sectorTimes, formatTime } from '../src/core/timing.js';
import { speedZone, speedKmh } from '../src/core/speedo.js';

const ORIGIN = { lat: 37.9, lon: 23.9 };

// Πίστα «στάδιο»: 2 ευθείες 200 μ. και 2 ημικύκλια ακτίνας 50 μ. (~714 μ.)
function stadium(s, offset = 0) {
  const L = 200, r = 50 + offset;
  const per = 2 * L + 2 * Math.PI * r;
  s = ((s % per) + per) % per;
  if (s < L) return { x: s - L / 2, y: -r };
  s -= L;
  if (s < Math.PI * r) { const a = -Math.PI / 2 + s / r; return { x: L / 2 + r * Math.cos(a), y: r * Math.sin(a) }; }
  s -= Math.PI * r;
  if (s < L) return { x: L / 2 - s, y: r };
  s -= L;
  const a = Math.PI / 2 + s / r;
  return { x: -L / 2 + r * Math.cos(a), y: r * Math.sin(a) };
}
const perimeter = (o) => 400 + 2 * Math.PI * (50 + o);

let seed = 42;
function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function noise(m) { return (rnd() - 0.5) * 2 * m; }

function fixAt(pt, t, noiseM) {
  const g = unproject(ORIGIN, { x: pt.x + noise(noiseM), y: pt.y + noise(noiseM) });
  return { lat: g.lat, lon: g.lon, t };
}

// --- 1. Χαρτογράφηση ---
{
  const speed = 20 / 3.6; // αργά
  const startS = 30; // πατάμε ΑΡΧΗ κάπου στην ευθεία
  const sides = [-2, -2, 2, 2];
  let t = 0;
  let frac = startS / perimeter(0); // θέση στον γύρο (0..1), ίδια για κάθε άκρη
  const at = (f, o) => stadium(f * perimeter(o), o);
  const first = fixAt(at(frac, sides[0]), t, 0);
  const rec = new MappingRecorder(first);
  let closes = 0;
  let guard = 0;
  while (!rec.done && guard++ < 5000) {
    t += 1000;
    const lapNo = Math.min(rec.lapIndex, 3);
    frac += speed / perimeter(sides[lapNo]);
    const pt = at(frac, sides[lapNo]);
    if (rec.add(fixAt(pt, t, 3))) closes++;
  }
  assert.equal(closes, 4, 'πρέπει να κλείσουν 4 γύροι');
  const shape = buildTrackShape(rec.laps);
  assert.equal(shape.center.length, 300);
  // Η κεντρική γραμμή πρέπει να είναι κοντά στην πραγματική (μέσα σε ~4 μ.)
  const startXY = project(ORIGIN, first);
  let maxErr = 0;
  for (const p of shape.center) {
    const abs = { x: p.x + startXY.x, y: p.y + startXY.y };
    let best = Infinity;
    for (let k = 0; k < 2000; k++) best = Math.min(best, dist(abs, stadium((k / 2000) * perimeter(0), 0)));
    maxErr = Math.max(maxErr, best);
  }
  console.log('Χαρτογράφηση: μέγιστο λάθος κεντρικής γραμμής =', maxErr.toFixed(2), 'μ.');
  assert.ok(maxErr < 5, 'η κεντρική γραμμή είναι αρκετά ακριβής');
  globalThis.__shape = { shape, origin: rec.origin };
}

// --- 2. Γραμμές και ταξινόμηση ---
const { shape, origin } = globalThis.__shape;
const track = { id: 't1', name: 'Δοκιμή', origin, ...shape, direction: 1, start: null, sectors: [] };
track.start = makeLineAt(track.center, 10);
track.sectors.push(makeLineAt(track.center, 200)); // βάζουμε πρώτα το «μακρινό»
track.sectors.push(makeLineAt(track.center, 100));
const ordered = orderSectors(track);
assert.deepEqual(ordered.map((l) => l.index), [100, 200], 'S1 πριν το S2 με τη φορά');
assert.deepEqual(checkpoints(track).map((c) => c.name), ['SECTOR 1', 'SECTOR 2', 'ΓΥΡΟΣ']);
const rev = { ...track, direction: -1 };
assert.deepEqual(orderSectors(rev).map((l) => l.index), [200, 100], 'ανάποδη φορά: αντίστροφα');
assert.ok(findLineNear(track, track.center[100], 5), 'βρίσκει γραμμή με άγγιγμα');
assert.equal(findLineNear(track, track.center[150], 5), null);
console.log('Γραμμές: OK');

// --- 3. Χρονομέτρηση ---
{
  const timer = new LapTimer(track);
  // Οδηγούμε στη μέση με 60 km/h, 1 σημάδι το δευτ., αρχίζοντας πριν την αφετηρία
  const speed = 60 / 3.6;
  const per = perimeter(0);
  // Η κεντρική γραμμή είναι σχετική με το σημείο ΑΡΧΗ της χαρτογράφησης (s=30)
  let t = 0;
  let s = 0;
  const events = [];
  for (let i = 0; i < 260; i++) {
    t += 1000;
    s += speed;
    const pt = stadium(s, 0);
    // μετακίνηση στο σύστημα της χαρτογράφησης
    const g = unproject(ORIGIN, { x: pt.x + noise(2), y: pt.y + noise(2) });
    events.push(...timer.feed({ lat: g.lat, lon: g.lon, t }));
  }
  const laps = timer.laps;
  const expected = (per / speed) * 1000;
  console.log('Χρονομέτρηση: γύροι =', laps.length, 'αναμενόμενος χρόνος ≈', formatTime(expected));
  laps.forEach((l) => console.log('  γύρος', l.n, formatTime(l.time), l.splits.map((x) => formatTime(x)).join(' / '), sectorTimes(l).map((x) => formatTime(x, false)).join(' + ')));
  assert.ok(laps.length >= 4, 'τουλάχιστον 4 γύροι');
  for (const l of laps) {
    assert.ok(Math.abs(l.time - expected) < 600, `ο γύρος ${l.n} είναι κοντά στον σωστό χρόνο`);
    assert.equal(l.splits.length, 2);
    assert.ok(l.splits.every((x) => x !== null));
  }
  // Πορεία γύρου (5α): κάθε γύρος θυμάται από πού πέρασε
  for (const l of laps) {
    assert.ok(Array.isArray(l.line) && l.line.length >= 40, `ο γύρος ${l.n} έχει πορεία`);
    assert.equal(l.line[0][2], 0, 'η πορεία ξεκινά στο 0 (πάνω στη γραμμή)');
    assert.equal(l.line[l.line.length - 1][2], Math.round(l.time), 'και τελειώνει στον χρόνο του γύρου');
    for (let i = 1; i < l.line.length; i++) assert.ok(l.line[i][2] >= l.line[i - 1][2], 'ο χρόνος πάει μόνο μπροστά');
  }
  // Το τέλος ενός γύρου = η αρχή του επόμενου (ίδιο σημείο πάνω στη γραμμή)
  const endA = laps[0].line[laps[0].line.length - 1], startB = laps[1].line[0];
  assert.deepEqual([endA[0], endA[1]], [startB[0], startB[1]]);
  console.log('Πορεία γύρου: OK,', laps[0].line.length, 'σημεία στον 1ο γύρο');
  const colors = events.filter((e) => e.type === 'point').map((e) => e.color);
  assert.equal(colors[0], null, 'πρώτο πέρασμα χωρίς χρώμα');
  assert.ok(colors.slice(3).every((c) => c === 'green' || c === 'red'));
  // Ανάποδη οδήγηση με κανονική φορά: δεν πρέπει να μετρά γύρους
  const timer2 = new LapTimer(track);
  t = 0; s = per * 3;
  for (let i = 0; i < 200; i++) { t += 1000; s -= speed; const pt = stadium(s, 0); const g = unproject(ORIGIN, pt); timer2.feed({ lat: g.lat, lon: g.lon, t }); }
  assert.equal(timer2.laps.length, 0, 'λάθος φορά = κανένας γύρος');
  // Ανάποδη πίστα + ανάποδη οδήγηση: μετρά
  const timer3 = new LapTimer(rev);
  t = 0; s = per * 3;
  for (let i = 0; i < 200; i++) { t += 1000; s -= speed; const pt = stadium(s, 0); const g = unproject(ORIGIN, pt); timer3.feed({ lat: g.lat, lon: g.lon, t }); }
  assert.ok(timer3.laps.length >= 3, 'ανάποδη φορά μετρά σωστά');
  console.log('Ανάποδη φορά: γύροι =', timer3.laps.length);
}

assert.equal(formatTime(48912), '0:48.9');
assert.equal(formatTime(12345, false), '12.3');
// Κοντέρ καταγραφής: τα χρώματα του «φαναριού»
assert.equal(speedZone(3).label, 'πιο γρήγορα');
assert.equal(speedZone(8).label, 'λίγο πιο γρήγορα');
assert.equal(speedZone(10).label, 'τέλεια');
assert.equal(speedZone(15).label, 'τέλεια');
assert.equal(speedZone(18).label, 'λίγο πιο αργά');
assert.equal(speedZone(25).label, 'πιο αργά!');
assert.equal(Math.round(speedKmh({ speed: 4 }, null)), 14); // 4 μ/δ = 14.4 km/h
{
  // Χωρίς ταχύτητα από το GPS: τη βγάζουμε από την απόσταση (10 μ. σε 2 δευτ. = 18 km/h)
  const a = unproject(ORIGIN, { x: 0, y: 0 }), b = unproject(ORIGIN, { x: 10, y: 0 });
  const v = speedKmh({ ...b, speed: null, t: 2000 }, { ...a, t: 0 });
  assert.ok(Math.abs(v - 18) < 0.5, 'ταχύτητα από απόσταση');
}
console.log('Κοντέρ: OK');

console.log('ΟΛΑ ΤΑ ΤΕΣΤ ΠΕΡΑΣΑΝ ✔');

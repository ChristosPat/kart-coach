// Χρονομέτρηση: βρίσκει πότε περνάς κάθε γραμμή και μετράει γύρους.
import { project, segmentIntersect, sub, dot } from './geo.js';
import { checkpoints } from './lines.js';

export const MIN_LAP_MS = 10000; // ένας γύρος δεν μπορεί να είναι πιο γρήγορος από 10 δευτ.

export class LapTimer {
  constructor(track) {
    this.track = track;
    this.origin = track.origin;
    this.direction = track.direction || 1;
    this.points = checkpoints(track); // S1, S2, ..., ΓΥΡΟΣ
    this.sectorCount = this.points.length - 1;
    this.prev = null; // προηγούμενο σημάδι GPS {p, t}
    this.lapStart = null; // χρόνος (ms) που ξεκίνησε ο τρέχων γύρος
    this.next = 0; // ποιο σημείο περιμένουμε (θέση στη λίστα points)
    this.splits = []; // αθροιστικοί χρόνοι του τρέχοντος γύρου
    this.laps = []; // ολοκληρωμένοι γύροι
    this.best = new Array(this.points.length).fill(null); // best κάθε σημείου στο session
  }

  get started() {
    return this.lapStart !== null;
  }

  // Περάσαμε τη γραμμή, με τη σωστή φορά, μέσα στο τμήμα a→b;
  crossing(line, a, b) {
    const f = segmentIntersect(a.p, b.p, line.a, line.b);
    if (f === null) return null;
    const move = sub(b.p, a.p);
    if (dot(move, line.tangent) * this.direction <= 0) return null; // λάθος φορά
    return a.t + f * (b.t - a.t); // ο ακριβής χρόνος ανάμεσα στα δύο σημάδια
  }

  // Δίνεις ένα σημάδι GPS {lat, lon, t}. Επιστρέφει λίστα με γεγονότα.
  feed(fix) {
    const cur = { p: project(this.origin, fix), t: fix.t };
    const events = [];
    if (this.prev && this.points.length > 0) {
      if (!this.started) {
        const startLine = this.points[this.points.length - 1];
        const tc = this.crossing(startLine, this.prev, cur);
        if (tc !== null) {
          this.beginLap(tc);
          events.push({ type: 'lapStart', t: tc });
        }
      } else {
        // Ψάχνουμε τα επόμενα σημεία με τη σειρά (αν χαθεί ένα sector, πάμε στο επόμενο)
        for (let k = this.next; k < this.points.length; k++) {
          const tc = this.crossing(this.points[k], this.prev, cur);
          if (tc === null) continue;
          const elapsed = tc - this.lapStart;
          const isFinish = k === this.points.length - 1;
          if (isFinish && elapsed < MIN_LAP_MS) break; // «τρέμουλο» πάνω στη γραμμή
          for (let s = this.next; s < k; s++) this.splits[s] = null; // χαμένα sectors
          events.push(this.recordPoint(k, elapsed));
          if (isFinish) {
            events.push(this.finishLap());
            this.beginLap(tc);
            events.push({ type: 'lapStart', t: tc });
          } else {
            this.next = k + 1;
          }
          break;
        }
      }
    }
    this.prev = cur;
    return events;
  }

  beginLap(t) {
    this.lapStart = t;
    this.next = 0;
    this.splits = [];
  }

  // Καταγράφει το πέρασμα από ένα σημείο και αποφασίζει πράσινο/κόκκινο
  recordPoint(k, elapsed) {
    const prevBest = this.best[k];
    let color = null; // πρώτη φορά: κανένα χρώμα
    if (prevBest !== null) color = elapsed <= prevBest ? 'green' : 'red';
    if (prevBest === null || elapsed < prevBest) this.best[k] = elapsed;
    this.splits[k] = elapsed;
    return { type: 'point', k, name: this.points[k].name, time: elapsed, color };
  }

  finishLap() {
    const n = this.points.length;
    const time = this.splits[n - 1];
    const lap = {
      n: this.laps.length + 1,
      time,
      splits: Array.from({ length: n - 1 }, (_, i) => (this.splits[i] === undefined ? null : this.splits[i])),
    };
    this.laps.push(lap);
    return { type: 'lap', lap };
  }

  // Τι δείχνει η οθόνη: το επόμενο σημείο και το best του
  nextPoint() {
    if (!this.started) return { name: '→ ΑΦΕΤΗΡΙΑ', best: null };
    const k = this.next;
    return { name: this.points[k].name, best: this.best[k] };
  }
}

// Χρόνοι κάθε sector από αθροιστικούς χρόνους (για την αναλυτική)
export function sectorTimes(lap) {
  const cum = [...lap.splits, lap.time];
  const out = [];
  let prev = 0;
  for (let i = 0; i < cum.length; i++) {
    if (cum[i] === null || prev === null) {
      out.push(null);
      prev = cum[i];
    } else {
      out.push(cum[i] - prev);
      prev = cum[i];
    }
  }
  return out;
}

export function formatTime(ms, withMinutes = true) {
  if (ms === null || ms === undefined || !isFinite(ms)) return '--';
  const neg = ms < 0;
  ms = Math.abs(ms);
  const totalTenths = Math.floor(ms / 100);
  const tenths = totalTenths % 10;
  const totalSec = Math.floor(totalTenths / 10);
  const sec = totalSec % 60;
  const min = Math.floor(totalSec / 60);
  const s = withMinutes || min > 0
    ? `${min}:${String(sec).padStart(2, '0')}.${tenths}`
    : `${sec}.${tenths}`;
  return neg ? `-${s}` : s;
}

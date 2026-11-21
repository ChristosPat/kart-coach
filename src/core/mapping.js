// Χαρτογράφηση πίστας: 4 αργοί γύροι (2 εσωτερική άκρη, 2 εξωτερική).
import { project, dist, resampleClosed, nearestIndex } from './geo.js';

export const LEAVE_DISTANCE = 50; // μέτρα: πρέπει να απομακρυνθείς τόσο για να «οπλίσει» ο κύκλος
export const CLOSE_RADIUS = 15; // μέτρα: ο «κύκλος με κιμωλία» γύρω από το σημείο ΑΡΧΗ
export const MAPPING_LAPS = 4;
export const LAP_SIDES = ['inner', 'inner', 'outer', 'outer'];

// Μαζεύει σημεία GPS και κλείνει μόνο του τους γύρους.
export class MappingRecorder {
  constructor(startFix) {
    this.origin = { lat: startFix.lat, lon: startFix.lon };
    this.startXY = { x: 0, y: 0 };
    this.laps = [];
    this.current = [{ x: 0, y: 0 }];
    this.left = false; // βγήκαμε από τον κύκλο;
  }

  get lapIndex() {
    return this.laps.length; // 0..3 όσο οδηγείς, 4 = τέλος
  }

  get done() {
    return this.laps.length >= MAPPING_LAPS;
  }

  // Επιστρέφει true τη στιγμή που κλείνει ένας γύρος
  add(fix) {
    if (this.done) return false;
    const p = project(this.origin, fix);
    this.current.push(p);
    const d = dist(p, this.startXY);
    if (!this.left && d > LEAVE_DISTANCE) this.left = true;
    if (this.left && d < CLOSE_RADIUS) {
      this.laps.push(this.current);
      this.current = [p];
      this.left = false;
      return true;
    }
    return false;
  }
}

const N = 300; // πόσα σημεία κρατάμε για κάθε γραμμή της πίστας

// Περιστρέφει τη λίστα ώστε να ξεκινά από το πιο κοντινό σημείο στο ref
function alignTo(pts, ref) {
  const { index } = nearestIndex(pts, ref);
  return pts.slice(index).concat(pts.slice(0, index));
}

function average(a, b) {
  return a.map((p, i) => ({ x: (p.x + b[i].x) / 2, y: (p.y + b[i].y) / 2 }));
}

// Από τους 4 γύρους φτιάχνει: εσωτερική άκρη, εξωτερική άκρη, κεντρική γραμμή
export function buildTrackShape(laps) {
  const sampled = laps.map((lap) => resampleClosed(lap, N));
  const ref = sampled[0][0];
  const aligned = sampled.map((s) => alignTo(s, ref));
  const inner = average(aligned[0], aligned[1]);
  const outer = average(aligned[2], aligned[3]);
  const center = average(inner, alignTo(outer, inner[0]));
  return { inner, outer, center };
}

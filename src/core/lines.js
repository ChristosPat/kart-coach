// Γραμμές χρονομέτρησης: αφετηρία και sectors.
// Κάθε γραμμή «κόβει» κάθετα την πίστα, σαν τη ζωγραφισμένη γραμμή στην άσφαλτο.
import { dist, nearestIndex, pointSegmentDistance } from './geo.js';

export const LINE_HALF_WIDTH = 12; // μέτρα προς κάθε πλευρά της κεντρικής γραμμής

function tangentAt(center, i) {
  const n = center.length;
  const a = center[(i - 2 + n) % n];
  const b = center[(i + 2) % n];
  const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
}

// Φτιάχνει γραμμή στο σημείο index της κεντρικής γραμμής
export function makeLineAt(center, index) {
  const c = center[index];
  const t = tangentAt(center, index);
  const nrm = { x: -t.y, y: t.x };
  return {
    index,
    a: { x: c.x + nrm.x * LINE_HALF_WIDTH, y: c.y + nrm.y * LINE_HALF_WIDTH },
    b: { x: c.x - nrm.x * LINE_HALF_WIDTH, y: c.y - nrm.y * LINE_HALF_WIDTH },
    tangent: t, // η φορά της χαρτογράφησης σε αυτό το σημείο
  };
}

// Το πιο κοντινό σημείο της κεντρικής γραμμής σε ένα άγγιγμα
export function nearestCenterIndex(center, p) {
  return nearestIndex(center, p);
}

// Ποια γραμμή άγγιξε ο χρήστης; (null αν καμία δεν είναι κοντά)
export function findLineNear(track, p, maxDist) {
  const all = [];
  if (track.start) all.push({ kind: 'start', i: -1, line: track.start });
  (track.sectors || []).forEach((line, i) => all.push({ kind: 'sector', i, line }));
  let best = null;
  for (const item of all) {
    const d = pointSegmentDistance(p, item.line.a, item.line.b);
    if (d <= maxDist && (!best || d < best.d)) best = { ...item, d };
  }
  return best;
}

// Θέση μιας γραμμής «πάνω στον γύρο», ξεκινώντας από την αφετηρία,
// με βάση τη φορά της πίστας (1 = όπως η χαρτογράφηση, -1 = ανάποδα).
function positionAlongLap(index, startIndex, n, direction) {
  const raw = (index - startIndex) * direction;
  return ((raw % n) + n) % n;
}

// Ταξινομεί τα sectors με τη σειρά που τα συναντάς στην οδήγηση
export function orderSectors(track) {
  const n = track.center.length;
  const startIndex = track.start ? track.start.index : 0;
  const dir = track.direction || 1;
  return [...(track.sectors || [])].sort(
    (s1, s2) =>
      positionAlongLap(s1.index, startIndex, n, dir) -
      positionAlongLap(s2.index, startIndex, n, dir)
  );
}

// Η σειρά των σημείων ενός γύρου: S1, S2, ..., και στο τέλος η αφετηρία
export function checkpoints(track) {
  const sectors = orderSectors(track);
  const list = sectors.map((line, k) => ({ ...line, name: `SECTOR ${k + 1}`, kind: 'sector' }));
  if (track.start) list.push({ ...track.start, name: 'ΓΥΡΟΣ', kind: 'start' });
  return list;
}

// Υπάρχει ήδη γραμμή πολύ κοντά σε αυτό το σημείο;
export function tooCloseToExisting(track, index, minPoints = 3) {
  const n = track.center.length;
  const lines = [track.start, ...(track.sectors || [])].filter(Boolean);
  return lines.some((l) => {
    const d = Math.abs(l.index - index);
    return Math.min(d, n - d) < minPoints;
  });
}

export function lineLength(line) {
  return dist(line.a, line.b);
}

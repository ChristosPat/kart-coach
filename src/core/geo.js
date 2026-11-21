// Γεωμετρία: μετατροπή GPS (lat/lon) σε μέτρα και βοηθητικές πράξεις.
// Σκέψου το σαν να απλώνουμε ένα μιλιμετρέ χαρτί πάνω στην πίστα:
// η αρχή (0,0) είναι ένα σημείο της πίστας και όλα μετριούνται σε μέτρα από εκεί.

const R = 6371000; // ακτίνα της Γης σε μέτρα

export function toRad(d) {
  return (d * Math.PI) / 180;
}

// Απόσταση σε μέτρα ανάμεσα σε δύο σημεία GPS
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Από GPS σε μέτρα (x προς ανατολή, y προς βορρά) γύρω από την αρχή origin
export function project(origin, p) {
  const x = toRad(p.lon - origin.lon) * R * Math.cos(toRad(origin.lat));
  const y = toRad(p.lat - origin.lat) * R;
  return { x, y };
}

// Από μέτρα πίσω σε GPS
export function unproject(origin, q) {
  const lat = origin.lat + (q.y / R) * (180 / Math.PI);
  const lon = origin.lon + (q.x / (R * Math.cos(toRad(origin.lat)))) * (180 / Math.PI);
  return { lat, lon };
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function cross(a, b) {
  return a.x * b.y - a.y * b.x;
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

// Τέμνονται τα ευθύγραμμα τμήματα p1→p2 και q1→q2;
// Αν ναι, επιστρέφει το t (0..1) πάνω στο p1→p2, αλλιώς null.
export function segmentIntersect(p1, p2, q1, q2) {
  const r = sub(p2, p1);
  const s = sub(q2, q1);
  const denom = cross(r, s);
  if (Math.abs(denom) < 1e-12) return null; // παράλληλα
  const qp = sub(q1, p1);
  const t = cross(qp, s) / denom;
  const u = cross(qp, r) / denom;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return t;
  return null;
}

// Μήκος μιας γραμμής από σημεία
export function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

// Ξαναμοιράζει τα σημεία μιας κλειστής διαδρομής σε n ίσες αποστάσεις
// (σαν να βάζεις πασσάλους κάθε τόσα μέτρα πάνω σε ένα σκοινί).
export function resampleClosed(pts, n) {
  const closed = pts.concat([pts[0]]);
  const total = pathLength(closed);
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const step = total / n;
  const out = [{ ...closed[0] }];
  let acc = 0;
  let target = step;
  for (let i = 1; i < closed.length && out.length < n; i++) {
    const a = closed[i - 1];
    const b = closed[i];
    const seg = dist(a, b);
    while (seg > 0 && acc + seg >= target && out.length < n) {
      const f = (target - acc) / seg;
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
      target += step;
    }
    acc += seg;
  }
  while (out.length < n) out.push({ ...closed[closed.length - 1] });
  return out;
}

// Το πιο κοντινό σημείο μιας λίστας (επιστρέφει τη θέση του)
export function nearestIndex(pts, p) {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = dist(pts[i], p);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return { index: best, distance: bestD };
}

// Απόσταση σημείου από ευθύγραμμο τμήμα
export function pointSegmentDistance(p, a, b) {
  const ab = sub(b, a);
  const L2 = dot(ab, ab);
  if (L2 === 0) return dist(p, a);
  let t = dot(sub(p, a), ab) / L2;
  t = Math.max(0, Math.min(1, t));
  return dist(p, { x: a.x + ab.x * t, y: a.y + ab.y * t });
}

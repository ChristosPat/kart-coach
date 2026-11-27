// Πορεία γύρου: σπάει τη γραμμή σε κομμάτια και δίνει σε κάθε κομμάτι
// χρώμα ανάλογα με την ταχύτητα. Έτσι βλέπεις πού φρενάρεις (κόκκινο)
// και πού πατάς γκάζι (πράσινο).
//
//  πιο αργά του γύρου ─────────────► πιο γρήγορα του γύρου
//       🔴 κόκκινο    🟡 κίτρινο    🟢 πράσινο

// lap.line = [[x, y, t], ...] → [{ a, b, kmh }, ...]
export function speedSegments(line) {
  const out = [];
  for (let i = 1; i < (line || []).length; i++) {
    const [x1, y1, t1] = line[i - 1];
    const [x2, y2, t2] = line[i];
    const dt = (t2 - t1) / 1000;
    if (dt <= 0) continue; // δύο σημεία την ίδια στιγμή: το προσπερνάμε
    const kmh = (Math.hypot(x2 - x1, y2 - y1) / dt) * 3.6;
    out.push({ a: { x: x1, y: y1 }, b: { x: x2, y: y2 }, kmh });
  }
  return out;
}

// Η πιο αργή και η πιο γρήγορη ταχύτητα του γύρου
export function speedRange(segs) {
  if (!segs.length) return { min: 0, max: 0 };
  let min = Infinity, max = -Infinity;
  for (const s of segs) {
    min = Math.min(min, s.kmh);
    max = Math.max(max, s.kmh);
  }
  return { min, max };
}

export const SLOW = '#E53935';
export const MID = '#F5B400';
export const FAST = '#1E9E4A';

// Χρώμα για μια ταχύτητα, σε σχέση με τον ίδιο τον γύρο:
// το αργό 1/3 κόκκινο, το μεσαίο κίτρινο, το γρήγορο 1/3 πράσινο
export function speedColor(kmh, { min, max }) {
  if (max - min < 1) return MID;
  const f = (kmh - min) / (max - min);
  if (f < 1 / 3) return SLOW;
  if (f < 2 / 3) return MID;
  return FAST;
}

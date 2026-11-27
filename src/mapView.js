// Μετατροπή κόσμος (μέτρα) ↔ οθόνη (pixels), με ζουμ και μετακίνηση.
// Τη χρησιμοποιούν οι Γραμμές και η Πορεία γύρου.
export function makeView(track, W, H, zoom, pan) {
  const all = [...track.inner, ...track.outer];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of all) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const pad = 24;
  const base = Math.min((W - 2 * pad) / Math.max(maxX - minX, 20), (H - 2 * pad) / Math.max(maxY - minY, 20));
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const k = base * zoom;
  return {
    k,
    toScreen: (p) => ({ x: (p.x - cx) * k + W / 2 + pan.x, y: -(p.y - cy) * k + H / 2 + pan.y }),
    toWorld: (sx, sy) => ({ x: (sx - W / 2 - pan.x) / k + cx, y: -(sy - H / 2 - pan.y) / k + cy }),
  };
}

// Λίστα σημείων → κείμενο για <Polyline points="...">
export const pts = (arr, v) => arr.map((p) => { const q = v.toScreen(p); return `${q.x},${q.y}`; }).join(' ');

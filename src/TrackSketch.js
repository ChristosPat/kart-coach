// Μικρό σχέδιο: ζωγραφίζει σημεία/γραμμές ώστε να χωράνε στο κουτί.
import React from 'react';
import Svg, { Polyline, Circle } from 'react-native-svg';

export function fit(allPts, w, h, pad = 16) {
  if (!allPts.length) return () => ({ x: w / 2, y: h / 2 });
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of allPts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const spanX = Math.max(maxX - minX, 20);
  const spanY = Math.max(maxY - minY, 20);
  const scale = Math.min((w - 2 * pad) / spanX, (h - 2 * pad) / spanY);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Ο βορράς πάνω: το y της οθόνης μεγαλώνει προς τα κάτω, γι' αυτό το «-»
  return (p) => ({ x: (p.x - cx) * scale + w / 2, y: -(p.y - cy) * scale + h / 2 });
}

export default function TrackSketch({ width, height, paths = [], dot }) {
  const all = paths.flatMap((p) => p.points);
  if (dot) all.push(dot);
  const tf = fit(all, width, height);
  return (
    <Svg width={width} height={height}>
      {paths.map((p, i) =>
        p.points.length > 1 ? (
          <Polyline
            key={i}
            points={p.points.map((q) => { const s = tf(q); return `${s.x},${s.y}`; }).join(' ')}
            fill="none"
            stroke={p.color}
            strokeWidth={p.width || 3}
            strokeLinejoin="round"
          />
        ) : null
      )}
      {dot ? <Circle cx={tf(dot).x} cy={tf(dot).y} r={8} fill="#F5B400" /> : null}
    </Svg>
  );
}

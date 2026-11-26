// Κοντέρ της καταγραφής: σαν φανάρι, λέει αν οδηγείς με σωστή ταχύτητα.
//
//  0 ──── 7 ──── 10 ═════ 15 ──── 20 ────►
//    μπλε   κίτρινο  ΠΡΑΣΙΝΟ  κίτρινο  κόκκινο
//
// Γιατί 10–15 km/h; Το GPS δίνει ~1 σημείο το δευτερόλεπτο.
// Στα 15 km/h αυτό είναι ένα σημείο κάθε ~4 μέτρα: αρκετά πυκνό.
// Πιο αργά από 7, το GPS «τρέμει» επί τόπου.

import { haversine } from './geo.js';

export const SPEEDO = {
  tooSlow: 7, // κάτω από εδώ: μπλε
  goodFrom: 10, // από εδώ...
  goodTo: 15, // ...ως εδώ: πράσινο
  tooFast: 20, // πάνω από εδώ: κόκκινο
};

const BLUE = '#4FC3F7';
const YELLOW = '#F5B400';
const GREEN = '#1E9E4A';
const RED = '#C62828';

// Δίνει χρώμα και μικρή λέξη για μια ταχύτητα (km/h)
export function speedZone(kmh) {
  if (kmh < SPEEDO.tooSlow) return { color: BLUE, label: 'πιο γρήγορα' };
  if (kmh < SPEEDO.goodFrom) return { color: YELLOW, label: 'λίγο πιο γρήγορα' };
  if (kmh <= SPEEDO.goodTo) return { color: GREEN, label: 'τέλεια' };
  if (kmh <= SPEEDO.tooFast) return { color: YELLOW, label: 'λίγο πιο αργά' };
  return { color: RED, label: 'πιο αργά!' };
}

// Ταχύτητα σε km/h: από το GPS, ή (αν δεν τη δίνει) από την απόσταση
// ανάμεσα στο προηγούμενο και το τωρινό σημάδι.
export function speedKmh(fix, prev) {
  let v = fix.speed;
  if ((v === null || v === undefined) && prev) {
    const dt = (fix.t - prev.t) / 1000;
    if (dt > 0) v = haversine(prev, fix) / dt;
  }
  return v ? v * 3.6 : 0;
}

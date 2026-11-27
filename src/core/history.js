// Λογική του Ιστορικού: ποιες πίστες έχουν χρόνους και πώς μπαίνουν τα sessions σε σειρά.
// (Χωρίς οθόνη, για να μπορεί να ελεγχθεί με τεστ.)

// Οι πίστες που έχουν sessions, πρώτη αυτή που οδήγησες πιο πρόσφατα.
// Επιστρέφει [{ trackId, trackName }]
export function tracksByRecent(sessions) {
  const latest = {};
  const name = {};
  for (const x of sessions) {
    if (!(x.trackId in latest) || x.startedAt > latest[x.trackId]) {
      latest[x.trackId] = x.startedAt;
      name[x.trackId] = x.trackName;
    }
  }
  return Object.keys(latest)
    .sort((a, b) => latest[b] - latest[a])
    .map((trackId) => ({ trackId, trackName: name[trackId] }));
}

// Τα sessions μιας πίστας, ομαδοποιημένα ανά μέρα.
// Νεότερη μέρα πρώτη, και μέσα στη μέρα νεότερο session πρώτο.
// Επιστρέφει [{ day: '2026-11-26', sessions: [...] }]
export function groupByDay(sessions, trackId) {
  const mine = sessions.filter((x) => x.trackId === trackId);
  const days = {};
  for (const x of mine) (days[x.day] = days[x.day] || []).push(x);
  return Object.keys(days)
    .sort()
    .reverse()
    .map((day) => ({ day, sessions: days[day].sort((a, b) => b.startedAt - a.startedAt) }));
}

// Ποια καρτέλα ανοίγει πρώτη: η επιλεγμένη πίστα αν έχει χρόνους, αλλιώς η πιο πρόσφατη.
export function firstTab(tracks, selectedId) {
  if (tracks.some((t) => t.trackId === selectedId)) return selectedId;
  return tracks.length ? tracks[0].trackId : null;
}

const WEEKDAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο'];

// '2026-11-26' → 'Πέμπτη 26/11/2026'
export function dayTitle(key) {
  const [y, m, d] = key.split('-').map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

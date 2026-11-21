// Αποθήκευση μέσα στο κινητό (χωρίς server).
// Σαν συρτάρια με ετικέτες: «πίστες», «sessions», «επιλεγμένη πίστα».
import AsyncStorage from '@react-native-async-storage/async-storage';

const K_TRACKS = 'kc.tracks';
const K_SESSIONS = 'kc.sessions';
const K_SELECTED = 'kc.selectedTrack';

async function readJSON(key, fallback) {
  try {
    const s = await AsyncStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch (e) {
    return fallback;
  }
}

async function writeJSON(key, value) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Πίστες ----------
export async function getTracks() {
  return readJSON(K_TRACKS, []);
}

export async function getTrack(id) {
  const tracks = await getTracks();
  return tracks.find((t) => t.id === id) || null;
}

export async function saveTrack(track) {
  const tracks = await getTracks();
  const i = tracks.findIndex((t) => t.id === track.id);
  if (i >= 0) tracks[i] = track;
  else tracks.push(track);
  await writeJSON(K_TRACKS, tracks);
}

export async function deleteTrack(id) {
  const tracks = await getTracks();
  await writeJSON(K_TRACKS, tracks.filter((t) => t.id !== id));
  const sel = await getSelectedTrackId();
  if (sel === id) await AsyncStorage.removeItem(K_SELECTED);
  // Τα sessions ΔΕΝ σβήνονται: κρατούν μέσα τους το όνομα της πίστας.
}

// ---------- Επιλεγμένη πίστα ----------
export async function getSelectedTrackId() {
  return AsyncStorage.getItem(K_SELECTED);
}

export async function setSelectedTrackId(id) {
  await AsyncStorage.setItem(K_SELECTED, id);
}

// ---------- Sessions ----------
export async function getSessions() {
  return readJSON(K_SESSIONS, []);
}

export function dayKey(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDay(key) {
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
}

// Αποθηκεύει ένα session και του δίνει αριθμό (Session 1, 2, ... της μέρας στην πίστα)
export async function saveSession(session) {
  const all = await getSessions();
  const sameDay = all.filter((s) => s.trackId === session.trackId && s.day === session.day);
  const saved = { ...session, number: sameDay.length + 1 };
  all.push(saved);
  await writeJSON(K_SESSIONS, all);
  return saved;
}

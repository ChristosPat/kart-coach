// 5. Ιστορικό σε ΜΙΑ οθόνη:
//    πάνω καρτέλες με τις πίστες, από κάτω τα sessions με τις μέρες σαν επικεφαλίδες.
//    Αρχική → Ιστορικό → Σύνοψη = 2 πατήματα.
import React, { useEffect, useState } from 'react';
import { Text, Pressable, View, ScrollView } from 'react-native';
import { Screen, Title, BigButton, List, useLandscape, s, C } from '../ui';
import { getSessions, getTracks, getSelectedTrackId } from '../storage';
import { formatTime } from '../core/timing';
import { tracksByRecent, groupByDay, firstTab, dayTitle } from '../core/history';
import { bestLap } from './SummaryScreen';

const hhmm = (ts) => {
  const t = new Date(ts);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
};

export default function HistoryScreen({ nav }) {
  const [sessions, setSessions] = useState(null);
  const [names, setNames] = useState({}); // τα τωρινά ονόματα (αν μετονόμασες πίστα)
  const [tab, setTab] = useState(null); // ποια πίστα βλέπουμε
  const land = useLandscape();

  useEffect(() => {
    (async () => {
      const [all, tracks, selected] = await Promise.all([getSessions(), getTracks(), getSelectedTrackId()]);
      const map = {};
      tracks.forEach((t) => (map[t.id] = t.name));
      setNames(map);
      setSessions(all);
      setTab(firstTab(tracksByRecent(all), selected));
    })();
  }, []);

  if (!sessions) return <Screen />;

  const tracks = tracksByRecent(sessions);
  const days = tab ? groupByDay(sessions, tab) : [];

  return (
    <Screen scroll={land}>
      <Title>Ιστορικό</Title>

      {/* Καρτέλες πιστών: σέρνονται δεξιά-αριστερά αν είναι πολλές */}
      {tracks.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 10 }}>
          {tracks.map((t) => {
            const on = t.trackId === tab;
            return (
              <Pressable
                key={t.trackId}
                onPress={() => setTab(t.trackId)}
                style={{
                  backgroundColor: on ? C.accent : C.card,
                  borderRadius: 22,
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: on ? '#111' : C.text, fontSize: 18, fontWeight: on ? '800' : '600' }}>
                  {names[t.trackId] || t.trackName}
                  {on ? ' ✔' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : tracks.length === 1 ? (
        <Text style={s.sub}>{names[tracks[0].trackId] || tracks[0].trackName}</Text>
      ) : null}

      <List>
        {tracks.length === 0 ? <Text style={s.empty}>Δεν υπάρχουν χρόνοι ακόμα.</Text> : null}
        {days.map((d) => (
          <View key={d.day}>
            {/* Η μέρα σαν επικεφαλίδα */}
            <Text style={{ color: C.dim, fontSize: 17, fontWeight: '700', marginTop: 14, marginBottom: 4 }}>
              ── {dayTitle(d.day)} ──
            </Text>
            {d.sessions.map((x) => (
              <Pressable
                key={x.id}
                onPress={() => nav.push('Summary', { sessionId: x.id, fromHistory: true })}
                style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}
              >
                <Text style={s.itemText}>
                  Session {x.number} · {hhmm(x.startedAt)}
                  {x.direction === -1 ? '  ⇄' : ''}
                </Text>
                <Text style={{ color: C.dim, fontSize: 16, marginTop: 4 }}>
                  {x.laps.length} γύροι · best {formatTime(bestLap(x).time)}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </List>

      <BigButton label="Πίσω" onPress={() => nav.pop()} />
    </Screen>
  );
}

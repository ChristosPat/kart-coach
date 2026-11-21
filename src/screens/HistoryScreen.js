// 5. Ιστορικό σαν μπαμπούσκες: Πίστα → Ημερομηνία → Session.
import React, { useEffect, useState } from 'react';
import { Text, Pressable, ScrollView, View } from 'react-native';
import { Screen, Title, BigButton, s, C } from '../ui';
import { getSessions, getTracks, formatDay } from '../storage';
import { formatTime } from '../core/timing';
import { bestLap } from './SummaryScreen';

export default function HistoryScreen({ nav, params }) {
  const [sessions, setSessions] = useState(null);
  const [names, setNames] = useState({});

  useEffect(() => {
    (async () => {
      const [all, tracks] = await Promise.all([getSessions(), getTracks()]);
      const map = {};
      tracks.forEach((t) => (map[t.id] = t.name));
      setNames(map);
      setSessions(all);
    })();
  }, []);

  if (!sessions) return <Screen />;
  const nameOf = (sess) => names[sess.trackId] || sess.trackName;
  const level = params.level;

  let title = 'Ιστορικό';
  let sub = null;
  let items = [];

  if (level === 'tracks') {
    // Μία γραμμή για κάθε πίστα, πρώτη αυτή που οδήγησες πιο πρόσφατα
    const latest = {};
    for (const x of sessions) latest[x.trackId] = Math.max(latest[x.trackId] || 0, x.startedAt);
    const ids = Object.keys(latest).sort((a, b) => latest[b] - latest[a]);
    items = ids.map((id) => {
      const sample = sessions.find((x) => x.trackId === id);
      return {
        key: id,
        label: nameOf(sample),
        onPress: () => nav.push('History', { level: 'dates', trackId: id }),
      };
    });
  } else if (level === 'dates') {
    const mine = sessions.filter((x) => x.trackId === params.trackId);
    title = nameOf(mine[0]);
    sub = 'Ημερομηνίες';
    const days = [...new Set(mine.map((x) => x.day))].sort().reverse();
    items = days.map((d) => {
      const reversed = mine.some((x) => x.day === d && x.direction === -1);
      return {
        key: d,
        label: formatDay(d) + (reversed ? '   ⇄ ανάποδα' : ''),
        onPress: () => nav.push('History', { level: 'sessions', trackId: params.trackId, day: d }),
      };
    });
  } else {
    const mine = sessions
      .filter((x) => x.trackId === params.trackId && x.day === params.day)
      .sort((a, b) => a.number - b.number);
    title = nameOf(mine[0]);
    sub = formatDay(params.day);
    items = mine.map((x) => {
      const time = new Date(x.startedAt);
      const hh = `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;
      return {
        key: x.id,
        label: `Session ${x.number}  ·  ${hh}${x.direction === -1 ? ' ⇄' : ''}`,
        detail: `${x.laps.length} γύροι · best ${formatTime(bestLap(x).time)}`,
        onPress: () => nav.push('Summary', { sessionId: x.id, fromHistory: true }),
      };
    });
  }

  return (
    <Screen>
      <Title sub={sub}>{title}</Title>
      <ScrollView style={{ flex: 1 }}>
        {items.length === 0 ? <Text style={s.empty}>Δεν υπάρχουν χρόνοι ακόμα.</Text> : null}
        {items.map((it) => (
          <Pressable key={it.key} onPress={it.onPress} style={({ pressed }) => [s.item, pressed && { opacity: 0.7 }]}>
            <Text style={s.itemText}>{it.label}</Text>
            {it.detail ? <Text style={{ color: C.dim, fontSize: 16, marginTop: 4 }}>{it.detail}</Text> : null}
          </Pressable>
        ))}
      </ScrollView>
      <View>
        <BigButton label="Πίσω" onPress={() => nav.pop()} />
      </View>
    </Screen>
  );
}

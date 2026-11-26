// Σύνοψη session: μόνο οι γύροι. Ίδια οθόνη στο τέλος του session και στο Ιστορικό.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen, BigButton, List, useLandscape, C } from '../ui';
import { getSessions, formatDay } from '../storage';
import { formatTime } from '../core/timing';

export function bestLap(session) {
  let best = null;
  for (const l of session.laps) if (best === null || l.time < best.time) best = l;
  return best;
}

export default function SummaryScreen({ nav, params }) {
  const [session, setSession] = useState(null);
  const land = useLandscape();

  useEffect(() => {
    getSessions().then((all) => setSession(all.find((x) => x.id === params.sessionId) || null));
  }, []);

  if (!session) return <Screen />;
  const best = bestLap(session);

  return (
    <Screen scroll={land}>
      <Text style={{ color: C.text, fontSize: 26, fontWeight: '800' }}>
        SESSION {session.number} — {session.trackName}
      </Text>
      <Text style={{ color: C.dim, fontSize: 18, marginTop: 4 }}>
        {formatDay(session.day)}
        {session.direction === -1 ? '   ⇄ ανάποδα' : ''}
      </Text>
      <Text style={{ color: C.text, fontSize: 20, marginTop: 10 }}>Γύροι: {session.laps.length}</Text>
      <Text style={{ color: C.accent, fontSize: 22, fontWeight: '700', marginBottom: 10 }}>
        Καλύτερος: {formatTime(best.time)} ({best.n})
      </Text>
      <View style={{ height: 1, backgroundColor: C.line, marginBottom: 6 }} />
      <List>
        {session.laps.map((l) => (
          <View key={l.n} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }}>
            <Text style={{ color: C.dim, fontSize: 22, width: 50 }}>{l.n}</Text>
            <Text style={{ color: l === best ? C.accent : C.text, fontSize: 22, fontWeight: l === best ? '800' : '400', fontVariant: ['tabular-nums'] }}>
              {formatTime(l.time)} {l === best ? '★' : ''}
            </Text>
          </View>
        ))}
      </List>
      <BigButton label="Αναλυτικά" onPress={() => nav.push('Analytic', { sessionId: session.id })} />
      {params.fromHistory ? (
        <BigButton label="Πίσω" onPress={() => nav.pop()} />
      ) : (
        <BigButton label="Αρχική" color={C.green} onPress={() => nav.home()} />
      )}
    </Screen>
  );
}

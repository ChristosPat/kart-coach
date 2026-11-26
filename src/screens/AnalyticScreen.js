// Αναλυτική: πίνακας γύροι × sectors. Σέρνεται, και γυρίζει αν γυρίσεις το κινητό.
import React, { useEffect, useState } from 'react';
import { Text, View, ScrollView } from 'react-native';
import { Screen, BigButton, List, useLandscape, C } from '../ui';
import { getSessions, formatDay } from '../storage';
import { formatTime, sectorTimes } from '../core/timing';
import { bestLap } from './SummaryScreen';

const COL = 86;

function Cell({ children, color, bold, width = COL }) {
  return (
    <Text style={{ width, color: color || C.text, fontSize: 19, fontWeight: bold ? '800' : '400', textAlign: 'right', fontVariant: ['tabular-nums'] }}>
      {children}
    </Text>
  );
}

export default function AnalyticScreen({ nav, params }) {
  const [session, setSession] = useState(null);
  const land = useLandscape();

  useEffect(() => {
    getSessions().then((all) => setSession(all.find((x) => x.id === params.sessionId) || null));
  }, []);

  if (!session) return <Screen />;
  const best = bestLap(session);
  const nSectors = (session.sectorCount || 0) + 1; // + το τελευταίο κομμάτι ως την αφετηρία
  const headers = Array.from({ length: nSectors }, (_, i) => `S${i + 1}`);

  return (
    <Screen scroll={land}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>
        SESSION {session.number} — {session.trackName} — {formatDay(session.day)}
        {session.direction === -1 ? ' ⇄' : ''}
      </Text>
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />
      <List>
        <ScrollView horizontal>
          <View>
            <View style={{ flexDirection: 'row', paddingVertical: 6 }}>
              <Cell width={40} color={C.dim}>#</Cell>
              {headers.map((h) => <Cell key={h} color={C.dim} bold>{h}</Cell>)}
              <Cell color={C.dim} bold width={100}>ΓΥΡΟΣ</Cell>
            </View>
            {session.laps.map((l) => {
              const st = sectorTimes(l);
              const isBest = l === best;
              return (
                <View key={l.n} style={{ flexDirection: 'row', paddingVertical: 7, borderTopWidth: 1, borderColor: C.line }}>
                  <Cell width={40} color={C.dim}>{l.n}</Cell>
                  {st.map((t, i) => <Cell key={i}>{formatTime(t, false)}</Cell>)}
                  <Cell width={100} color={isBest ? C.accent : C.text} bold={isBest}>
                    {formatTime(l.time)}{isBest ? '★' : ''}
                  </Cell>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </List>
      <BigButton label="Πίσω" onPress={() => nav.pop()} />
    </Screen>
  );
}

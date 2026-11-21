// 2. Επιλογή πίστας: λίστα, σημάδεμα, επιβεβαίωση.
import React, { useEffect, useState } from 'react';
import { Text, Pressable, ScrollView } from 'react-native';
import { Screen, Title, BigButton, Notice, s, C } from '../ui';
import { getTracks, setSelectedTrackId } from '../storage';

export default function SelectTrackScreen({ nav }) {
  const [tracks, setTracks] = useState(null);
  const [marked, setMarked] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    getTracks().then((t) => setTracks([...t].sort((a, b) => a.name.localeCompare(b.name, 'el'))));
  }, []);

  const choose = async () => {
    if (!marked) return setMsg('Διάλεξε πρώτα μια πίστα.');
    await setSelectedTrackId(marked);
    nav.home();
  };

  return (
    <Screen>
      <Title>Επιλογή πίστας</Title>
      <BigButton label="+ Νέα πίστα" color={C.accent} textStyle={{ color: '#111' }} onPress={() => nav.replace('Mapping')} />
      <ScrollView style={{ flex: 1, marginTop: 10 }}>
        {tracks && tracks.length === 0 ? (
          <Text style={s.empty}>Δεν υπάρχουν πίστες ακόμα.{'\n'}Πάτα «+ Νέα πίστα» για να ξεκινήσεις.</Text>
        ) : null}
        {(tracks || []).map((t) => (
          <Pressable
            key={t.id}
            onPress={() => setMarked(t.id)}
            style={[s.item, marked === t.id && { borderColor: C.accent, borderWidth: 3 }]}
          >
            <Text style={[s.itemText, marked === t.id && { color: C.accent, fontWeight: '800' }]}>
              {marked === t.id ? '▶ ' : ''}
              {t.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <BigButton label="Επιλογή" color={C.green} onPress={choose} />
      <Notice visible={!!msg} message={msg} onClose={() => setMsg(null)} />
    </Screen>
  );
}

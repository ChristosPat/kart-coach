// 1. Αρχική οθόνη: 4 κουμπιά και η επιλεγμένη πίστα.
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Screen, BigButton, Notice, C } from '../ui';
import { getSelectedTrackId, getTrack } from '../storage';

export default function HomeScreen({ nav }) {
  const [track, setTrack] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      const id = await getSelectedTrackId();
      if (id) setTrack(await getTrack(id));
    })();
  }, []);

  const needTrack = (go) => () => {
    if (!track) return setMsg('Πρώτα διάλεξε πίστα.');
    go();
  };

  return (
    <Screen scroll>
      <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 30 }}>
        <Text style={{ color: C.accent, fontSize: 40, fontWeight: '900', letterSpacing: 2 }}>KART COACH</Text>
        {track ? (
          <Text style={{ color: C.text, fontSize: 22, marginTop: 10 }}>Πίστα: {track.name} ✔</Text>
        ) : null}
      </View>
      <BigButton label="Επιλογή πίστας" onPress={() => nav.push('SelectTrack')} />
      <BigButton label="Διαχείριση πίστας" onPress={needTrack(() => nav.push('Manage', { trackId: track.id }))} />
      <BigButton
        label="Χρονομέτρηση"
        onPress={needTrack(() => {
          if (!track.start) return setMsg('Η πίστα δεν έχει αφετηρία ακόμα.\nΒάλε τη στη Διαχείριση → Γραμμές.');
          nav.push('Timing', { trackId: track.id });
        })}
      />
      <BigButton label="Ιστορικό" onPress={() => nav.push('History', { level: 'tracks' })} />
      <Notice visible={!!msg} message={msg} onClose={() => setMsg(null)} />
    </Screen>
  );
}

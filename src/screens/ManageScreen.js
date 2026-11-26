// 3. Διαχείριση πίστας: Όνομα, Γραμμές, Διαγραφή.
import React, { useEffect, useState } from 'react';
import { Text, TextInput, Modal, View } from 'react-native';
import { Screen, Title, BigButton, Confirm, Notice, C, s } from '../ui';
import { getTrack, saveTrack, deleteTrack } from '../storage';

export default function ManageScreen({ nav, params }) {
  const [track, setTrack] = useState(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const [askDelete, setAskDelete] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = () => getTrack(params.trackId).then(setTrack);
  useEffect(() => { load(); }, []);

  const saveName = async () => {
    const n = name.trim();
    if (!n) return setMsg('Γράψε ένα όνομα.');
    const t = { ...track, name: n };
    await saveTrack(t);
    setTrack(t);
    setRenaming(false);
  };

  if (!track) return <Screen />;
  return (
    <Screen scroll>
      <Title sub={`Πίστα: ${track.name}`}>Διαχείριση</Title>
      <BigButton label="Όνομα" onPress={() => { setName(track.name); setRenaming(true); }} />
      <BigButton label="Γραμμές" onPress={() => nav.push('Lines', { trackId: track.id })} />
      <BigButton label="Διαγραφή πίστας" color={C.red} onPress={() => setAskDelete(true)} style={{ marginTop: 30 }} />
      <View style={{ flex: 1 }} />
      <BigButton label="Πίσω" onPress={() => nav.home()} />

      <Modal visible={renaming} transparent animationType="fade" onRequestClose={() => setRenaming(false)} supportedOrientations={['portrait', 'landscape']}>
        <View style={s.backdrop}>
          <View style={s.dialog}>
            <Text style={s.dTitle}>Νέο όνομα</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              autoFocus
              style={{ backgroundColor: C.bg, color: C.text, fontSize: 22, padding: 14, borderRadius: 10, marginBottom: 10 }}
            />
            <BigButton label="Αποθήκευση" color={C.green} onPress={saveName} />
            <BigButton label="Άκυρο" onPress={() => setRenaming(false)} />
          </View>
        </View>
      </Modal>
      <Confirm
        visible={askDelete}
        title="Σίγουρα;"
        message={`Θα σβηστεί η πίστα «${track.name}». Οι χρόνοι της μένουν στο Ιστορικό.`}
        safeLabel="Όχι, την κρατάω"
        dangerLabel="ναι, διαγραφή"
        onSafe={() => setAskDelete(false)}
        onDanger={async () => { await deleteTrack(track.id); nav.home(); }}
      />
      <Notice visible={!!msg} message={msg} onClose={() => setMsg(null)} />
    </Screen>
  );
}

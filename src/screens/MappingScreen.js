// 2α. Νέα πίστα: ΑΡΧΗ → 4 αργοί γύροι → όνομα → αποθήκευση.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, useWindowDimensions } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Screen, Title, BigButton, SmallButton, Confirm, Notice, C, s } from '../ui';
import TrackSketch from '../TrackSketch';
import { askPermission, watchGps } from '../gps';
import { MappingRecorder, buildTrackShape, LAP_SIDES, MAPPING_LAPS } from '../core/mapping';
import { saveTrack, setSelectedTrackId, newId } from '../storage';

const SIDE_NAME = { inner: 'ΕΣΩΤΕΡΙΚΗ ΑΚΡΗ', outer: 'ΕΞΩΤΕΡΙΚΗ ΑΚΡΗ' };
const LAP_COLORS = ['#4FC3F7', '#29B6F6', '#FFB74D', '#FFA726'];

export default function MappingScreen({ nav }) {
  const { width, height } = useWindowDimensions();
  const land = width > height; // ξαπλωμένο κινητό
  const [phase, setPhase] = useState('ready'); // ready → driving → name
  const [fix, setFix] = useState(null);
  const [noPerm, setNoPerm] = useState(false);
  const [tick, setTick] = useState(0); // για να ξαναζωγραφίζεται η οθόνη
  const [flash, setFlash] = useState(false);
  const [askCancel, setAskCancel] = useState(false);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState(null);
  const recRef = useRef(null);
  const phaseRef = useRef('ready');

  useEffect(() => {
    let stop = null;
    let alive = true;
    (async () => {
      if (!(await askPermission())) return setNoPerm(true);
      activateKeepAwakeAsync('mapping').catch(() => {});
      stop = await watchGps((f) => {
        if (!alive) return;
        setFix(f);
        const rec = recRef.current;
        if (phaseRef.current === 'driving' && rec) {
          if (rec.add(f)) {
            setFlash(true);
            setTimeout(() => setFlash(false), 2000);
            if (rec.done) {
              phaseRef.current = 'name';
              setPhase('name');
            }
          }
          setTick((t) => t + 1);
        }
      });
    })();
    return () => {
      alive = false;
      if (stop) stop();
      deactivateKeepAwake('mapping');
    };
  }, []);

  // Το κουμπί Πίστω του κινητού στη μέση της χαρτογράφησης = Ακύρωση
  useEffect(() => {
    nav.setBackHandler(phase === 'ready' ? null : () => setAskCancel(true));
  }, [phase]);

  const start = () => {
    if (!fix) return;
    recRef.current = new MappingRecorder(fix);
    phaseRef.current = 'driving';
    setPhase('driving');
  };

  const save = async () => {
    const n = name.trim();
    if (!n) return setMsg('Γράψε ένα όνομα για την πίστα.');
    const rec = recRef.current;
    const shape = buildTrackShape(rec.laps);
    const track = {
      id: newId(),
      name: n,
      createdAt: Date.now(),
      origin: rec.origin,
      ...shape,
      direction: 1,
      start: null,
      sectors: [],
    };
    await saveTrack(track);
    await setSelectedTrackId(track.id);
    nav.home();
  };

  if (noPerm) {
    return (
      <Screen>
        <Title>Νέα πίστα</Title>
        <Text style={s.empty}>Η εφαρμογή χρειάζεται άδεια για το GPS.{'\n'}Δώσε άδεια «Τοποθεσία» στις ρυθμίσεις του κινητού.</Text>
        <BigButton label="Πίσω" onPress={() => nav.pop()} />
      </Screen>
    );
  }

  const rec = recRef.current;

  if (phase === 'name') {
    return (
      <Screen scroll>
        <Title>Η χαρτογράφηση τελείωσε ✔</Title>
        {/* Όρθιο: σχέδιο πάνω, όνομα κάτω. Ξαπλωτό: σχέδιο αριστερά, όνομα δεξιά. */}
        <View style={{ flexDirection: land ? 'row' : 'column' }}>
          <TrackSketch
            width={land ? width * 0.45 : width - 36}
            height={land ? Math.max(180, height - 150) : 260}
            paths={rec.laps.map((l, i) => ({ points: l, color: LAP_COLORS[i], width: 2 }))}
          />
          <View style={{ flex: land ? 1 : 0, marginLeft: land ? 16 : 0 }}>
            <Text style={{ color: C.text, fontSize: 20, marginTop: land ? 0 : 16 }}>Όνομα πίστας:</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="π.χ. Σπάτα"
              placeholderTextColor={C.dim}
              style={{ backgroundColor: C.card, color: C.text, fontSize: 22, padding: 14, borderRadius: 10, marginVertical: 10 }}
            />
            <BigButton label="Αποθήκευση" color={C.green} onPress={save} />
          </View>
        </View>
        <Notice visible={!!msg} message={msg} onClose={() => setMsg(null)} />
      </Screen>
    );
  }

  if (phase === 'ready') {
    const good = fix && fix.accuracy !== null && fix.accuracy < 25;
    return (
      <Screen>
        {/* Όρθιο: οδηγίες πάνω, ΑΡΧΗ κάτω. Ξαπλωτό: οδηγίες αριστερά, ΑΡΧΗ δεξιά. */}
        <View style={{ flex: 1, flexDirection: land ? 'row' : 'column' }}>
          <View style={{ flex: land ? 1 : 0, marginRight: land ? 20 : 0 }}>
            <Title sub="Στάσου στο σημείο που μπαίνεις στην πίστα">Νέα πίστα</Title>
            <Text style={{ color: C.dim, fontSize: 18, lineHeight: 26 }}>
              Θα οδηγήσεις {MAPPING_LAPS} αργούς γύρους:{'\n'}• 2 στην εσωτερική άκρη{'\n'}• 2 στην εξωτερική άκρη{'\n'}Οι γύροι κλείνουν μόνοι τους.
            </Text>
          </View>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <BigButton
              label={fix ? 'ΑΡΧΗ ▶' : 'Αναμονή GPS...'}
              disabled={!fix}
              color={C.green}
              onPress={start}
              style={{ paddingVertical: land ? 40 : 60 }}
              textStyle={{ fontSize: 40 }}
            />
            <Text style={{ color: good ? C.green : C.dim, textAlign: 'center', fontSize: 16 }}>
              {fix ? `Ακρίβεια GPS: ${Math.round(fix.accuracy || 0)} μ.` : ''}
            </Text>
          </View>
        </View>
        <SmallButton label="Πίσω" onPress={() => nav.pop()} style={{ alignSelf: 'flex-start' }} />
      </Screen>
    );
  }

  // Οδήγηση
  const lapNo = Math.min(rec.lapIndex, MAPPING_LAPS - 1);
  const paths = [
    ...rec.laps.map((l, i) => ({ points: l, color: LAP_COLORS[i], width: 2 })),
    { points: rec.current, color: '#FFFFFF', width: 3 },
  ];
  // Τα «κομμάτια» της οθόνης. Τα στήνουμε μία φορά και τα τοποθετούμε
  // αλλιώς στο όρθιο και αλλιώς στο ξαπλωτό, σαν τα ίδια έπιπλα σε άλλο δωμάτιο.
  const lapInfo = (
    <>
      <Text style={{ color: C.text, fontSize: land ? 36 : 44, fontWeight: '900', textAlign: 'center' }}>
        ΓΥΡΟΣ {lapNo + 1} / {MAPPING_LAPS}
      </Text>
      <Text style={{ color: C.accent, fontSize: land ? 24 : 28, fontWeight: '800', textAlign: 'center', marginBottom: 10 }}>
        {SIDE_NAME[LAP_SIDES[lapNo]]}
      </Text>
    </>
  );
  const gpsInfo = (
    <Text style={{ color: C.dim, textAlign: 'center', fontSize: 15 }}>
      {fix ? `GPS ±${Math.round(fix.accuracy || 0)} μ. · σημεία: ${rec.current.length}` : ''}
      {tick ? '' : ''}
    </Text>
  );
  const cancelBtn = (
    <SmallButton label="Ακύρωση" color={C.red} onPress={() => setAskCancel(true)} style={{ alignSelf: 'flex-end', marginTop: 8 }} />
  );

  return (
    <Screen style={flash ? { backgroundColor: C.green } : null}>
      {land ? (
        // Ξαπλωτό: χάρτης αριστερά (όλο το ύψος), πληροφορίες δεξιά
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <TrackSketch width={width * 0.55} height={height - 48} paths={paths} dot={{ x: 0, y: 0 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', marginLeft: 12 }}>
            {lapInfo}
            {gpsInfo}
            <View style={{ flex: 1 }} />
            {cancelBtn}
          </View>
        </View>
      ) : (
        // Όρθιο: όπως πριν, το ένα κάτω από το άλλο
        <>
          {lapInfo}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <TrackSketch width={width - 36} height={340} paths={paths} dot={{ x: 0, y: 0 }} />
          </View>
          {gpsInfo}
          {cancelBtn}
        </>
      )}
      <Confirm
        visible={askCancel}
        title="Σίγουρα;"
        message="Θα χαθούν οι γύροι."
        safeLabel="Όχι, συνεχίζω"
        dangerLabel="ναι, ακύρωση"
        onSafe={() => setAskCancel(false)}
        onDanger={() => nav.pop()}
      />
    </Screen>
  );
}

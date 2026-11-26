// 4. Χρονομέτρηση.
// Ξαπλωτό: ταχύτητα αριστερά, live χρόνος δεξιά.
// Όρθιο (π.χ. τάμπλετ): ταχύτητα πάνω, live χρόνος κάτω.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { BigButton, SmallButton, Confirm, Notice, C } from '../ui';
import { askPermission, watchGps } from '../gps';
import { LapTimer, formatTime } from '../core/timing';
import { haversine } from '../core/geo';
import { getTrack, saveSession, dayKey } from '../storage';

const STOP_SPEED = 5; // km/h
const STOP_SECONDS = 5;

export default function TimingScreen({ nav, params }) {
  const { width, height } = useWindowDimensions();
  const [track, setTrack] = useState(null);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [, setFrame] = useState(0);
  const [flash, setFlash] = useState(null); // 'green' | 'red'
  const [stopped, setStopped] = useState(false); // φαίνονται τα 2 κουμπιά;
  const [askEnd, setAskEnd] = useState(false);
  const [msg, setMsg] = useState(null);
  const [noPerm, setNoPerm] = useState(false);
  const [hasFix, setHasFix] = useState(false);

  const timerRef = useRef(null);
  const offsetRef = useRef(0); // διαφορά ρολογιού κινητού - χρόνου GPS
  const lastFix = useRef(null);
  const slowSince = useRef(null);
  const dismissed = useRef(false); // πάτησε «Συνέχεια» σε αυτό το σταμάτημα
  const flashTimer = useRef(null);
  const startedAt = useRef(null);

  useEffect(() => {
    getTrack(params.trackId).then(setTrack);
  }, []);

  // Το κουμπί Πίσω του κινητού = [Τέλος] με επιβεβαίωση
  useEffect(() => {
    nav.setBackHandler(running ? () => setAskEnd(true) : null);
  }, [running]);

  // Ανανέωση του live χρόνου 10 φορές το δευτερόλεπτο
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setFrame((f) => f + 1), 100);
    return () => clearInterval(id);
  }, [running]);

  // GPS
  useEffect(() => {
    if (!running || !track) return;
    let stop = null;
    let alive = true;
    activateKeepAwakeAsync('timing').catch(() => {});
    (async () => {
      stop = await watchGps((f) => {
        if (!alive) return;
        setHasFix(true);
        offsetRef.current = f.received - f.t;
        // Ταχύτητα: από το GPS, ή από την απόσταση ανάμεσα σε δύο σημάδια
        let v = f.speed;
        if (v === null && lastFix.current) {
          const dt = (f.t - lastFix.current.t) / 1000;
          if (dt > 0) v = haversine(lastFix.current, f) / dt;
        }
        lastFix.current = f;
        const kmh = v ? v * 3.6 : 0;
        setSpeed(kmh);
        checkStop(kmh);

        for (const ev of timerRef.current.feed(f)) {
          if (ev.type === 'point' && ev.color) {
            setFlash(ev.color);
            clearTimeout(flashTimer.current);
            flashTimer.current = setTimeout(() => setFlash(null), 2000);
          }
        }
      });
    })();
    return () => {
      alive = false;
      if (stop) stop();
      clearTimeout(flashTimer.current);
      deactivateKeepAwake('timing');
    };
  }, [running, track]);

  function checkStop(kmh) {
    if (kmh < STOP_SPEED) {
      if (slowSince.current === null) slowSince.current = Date.now();
      if (!dismissed.current && Date.now() - slowSince.current >= STOP_SECONDS * 1000) setStopped(true);
    } else {
      // Ξεκίνησε ξανά: τα κουμπιά κρύβονται μόνα τους
      slowSince.current = null;
      dismissed.current = false;
      setStopped(false);
    }
  }

  const begin = async () => {
    if (!(await askPermission())) return setNoPerm(true);
    timerRef.current = new LapTimer(track);
    startedAt.current = Date.now();
    setRunning(true);
  };

  const end = async () => {
    setRunning(false);
    setAskEnd(false);
    setStopped(false);
    const timer = timerRef.current;
    if (!timer || timer.laps.length === 0) {
      setMsg('Δεν ολοκληρώθηκε κανένας γύρος, οπότε δεν αποθηκεύτηκε τίποτα.');
      return;
    }
    const t0 = startedAt.current;
    const saved = await saveSession({
      id: String(t0),
      trackId: track.id,
      trackName: track.name,
      startedAt: t0,
      day: dayKey(t0),
      direction: track.direction || 1,
      sectorCount: timer.sectorCount,
      laps: timer.laps,
    });
    nav.replace('Summary', { sessionId: saved.id, fromHistory: false });
  };

  if (!track) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  // --- Πριν την έναρξη: στα pits ---
  if (!running) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: C.text, fontSize: 26, textAlign: 'center', marginBottom: 6 }}>Πίστα: {track.name}</Text>
        <Text style={{ color: C.dim, fontSize: 18, textAlign: 'center', marginBottom: 20 }}>
          Πάτα ΕΝΑΡΞΗ στα pits. Ο χρόνος ξεκινά όταν περάσεις την αφετηρία.
        </Text>
        <BigButton label="ΕΝΑΡΞΗ ▶" color={C.green} onPress={begin} style={{ paddingVertical: 40 }} textStyle={{ fontSize: 40 }} />
        <SmallButton label="Πίσω" onPress={() => nav.pop()} style={{ alignSelf: 'flex-start', marginTop: 16 }} />
        <Notice visible={noPerm} message="Η εφαρμογή χρειάζεται άδεια για το GPS." onClose={() => setNoPerm(false)} />
        <Notice visible={!!msg} message={msg} onClose={() => { setMsg(null); nav.home(); }} />
      </View>
    );
  }

  // --- Οδήγηση ---
  const timer = timerRef.current;
  let live = 0;
  if (timer.started) live = Date.now() - offsetRef.current - timer.lapStart;
  const nextP = timer.nextPoint();

  const land = width > height;
  const bg = flash === 'green' ? C.green : flash === 'red' ? C.red : '#000';

  // Το κουτί της ταχύτητας: ξαπλωτό = 1/3 του πλάτους, όρθιο = 1/4 του ύψους
  const speedW = land ? width / 3 : width;
  const speedH = land ? height : height / 4;
  // Το κουτί των χρόνων: ό,τι περισσεύει
  const timeW = land ? width - speedW : width;
  const timeH = land ? height : height - speedH;
  const liveH = (timeH * 6) / 9;
  const titleH = timeH / 9;
  const bestH = (timeH * 2) / 9;
  // Πόσο μεγάλα τα νούμερα: όσο επιτρέπει το στενότερο από πλάτος και ύψος
  const speedFont = Math.min(speedW * 0.42, speedH * 0.55);

  return (
    <View style={{ flex: 1, flexDirection: land ? 'row' : 'column', backgroundColor: bg }}>
      <View
        style={{
          width: speedW,
          height: speedH,
          justifyContent: 'center',
          alignItems: 'center',
          borderColor: '#333',
          ...(land ? { borderRightWidth: 2 } : { borderBottomWidth: 2 }),
        }}
      >
        <Text style={{ color: '#fff', fontSize: speedFont, fontWeight: '900' }} adjustsFontSizeToFit numberOfLines={1}>
          {Math.round(speed)}
        </Text>
        <Text style={{ color: C.dim, fontSize: 22 }}>km/h</Text>
        {!hasFix ? <Text style={{ color: C.accent, fontSize: 16, marginTop: 8 }}>Αναμονή GPS...</Text> : null}
        <SmallButton label="Τέλος" onPress={() => setAskEnd(true)} style={{ position: 'absolute', left: 10, bottom: 10 }} />
      </View>
      <View style={{ width: timeW }}>
        <View style={{ height: liveH, justifyContent: 'center', alignItems: 'center' }}>
          <Text
            style={{ color: '#fff', fontSize: Math.min(liveH * 0.55, timeW * 0.2), fontWeight: '900', fontVariant: ['tabular-nums'] }}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatTime(live)}
          </Text>
        </View>
        <View style={{ height: titleH, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderColor: '#333' }}>
          <Text style={{ color: C.accent, fontSize: titleH * 0.5, fontWeight: '700' }} numberOfLines={1}>
            {nextP.name.startsWith('→') ? nextP.name : `→ ${nextP.name}`}
          </Text>
        </View>
        <View style={{ height: bestH, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderColor: '#333' }}>
          <Text style={{ color: '#ddd', fontSize: bestH * 0.45, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
            Best: {formatTime(nextP.best)}
          </Text>
        </View>
      </View>

      {stopped && !askEnd ? (
        // Καλύπτει μόνο το κουτί των χρόνων, ώστε να φαίνεται η ταχύτητα
        <View style={{ position: 'absolute', left: land ? speedW : 0, top: land ? 0 : speedH, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <BigButton
            label="ΣΥΝΕΧΕΙΑ"
            color={C.green}
            onPress={() => { dismissed.current = true; setStopped(false); }}
            style={{ flex: 1, marginHorizontal: 12, paddingVertical: 40 }}
            textStyle={{ fontSize: 30 }}
          />
          <BigButton label="Τερματισμός" color={C.red} onPress={end} style={{ flex: 1, marginHorizontal: 12, paddingVertical: 40 }} textStyle={{ fontSize: 24 }} />
        </View>
      ) : null}

      <Confirm
        visible={askEnd}
        title="Τέλος session;"
        message="Οι γύροι που ολοκληρώθηκαν θα αποθηκευτούν."
        safeLabel="Όχι, συνεχίζω"
        dangerLabel="ναι, τέλος"
        onSafe={() => setAskEnd(false)}
        onDanger={end}
      />
    </View>
  );
}

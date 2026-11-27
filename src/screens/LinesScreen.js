// 3. Διαχείριση → Γραμμές: αφετηρία, sectors, φορά, με ζουμ.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, PanResponder, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line, Circle, Polygon, Text as SvgText } from 'react-native-svg';
import { Screen, BigButton, SmallButton, Notice, Confirm, C } from '../ui';
import { getTrack, saveTrack } from '../storage';
import { makeLineAt, nearestCenterIndex, findLineNear, orderSectors, tooCloseToExisting } from '../core/lines';
import { makeView, pts } from '../mapView';


export default function LinesScreen({ nav, params }) {
  const { width, height } = useWindowDimensions();
  const land = width > height; // ξαπλωμένο κινητό
  // Όρθιο: χάρτης σε όλο το πλάτος. Ξαπλωτό: χάρτης αριστερά σε όλο το ύψος, κουμπιά δεξιά.
  const W = land ? Math.round(width * 0.6) : width - 36;
  const H = land ? height - 48 : Math.max(260, height - 330);
  const [track, setTrack] = useState(null);
  const [draft, setDraft] = useState(null); // { start, sectors, direction }
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [marker, setMarker] = useState(null); // index στην κεντρική γραμμή
  const [picked, setPicked] = useState(null); // γραμμή που αγγίχτηκε (για σβήσιμο)
  const [msg, setMsg] = useState(null);
  const [askLeave, setAskLeave] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    getTrack(params.trackId).then((t) => {
      setTrack(t);
      setDraft({ start: t.start, sectors: t.sectors || [], direction: t.direction || 1 });
    });
  }, []);

  useEffect(() => {
    nav.setBackHandler(dirty ? () => setAskLeave(true) : null);
  }, [dirty]);

  // Κρατάμε τις τελευταίες τιμές για τον χειρισμό αγγίγματος
  const live = useRef({});
  live.current = { track, draft, zoom, pan, W, H };

  const gesture = useRef({});
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const t = e.nativeEvent.touches;
          gesture.current = {
            start: Date.now(),
            moved: 0,
            zoom0: live.current.zoom,
            pan0: live.current.pan,
            d0: t.length > 1 ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : null,
            x0: e.nativeEvent.locationX,
            y0: e.nativeEvent.locationY,
            multi: t.length > 1,
          };
        },
        onPanResponderMove: (e, g) => {
          const t = e.nativeEvent.touches;
          const st = gesture.current;
          st.moved = Math.max(st.moved, Math.hypot(g.dx, g.dy));
          if (t.length > 1) {
            const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
            if (!st.d0) { st.d0 = d; st.zoom0 = live.current.zoom; }
            st.multi = true;
            setZoom(Math.min(30, Math.max(1, (st.zoom0 * d) / st.d0)));
          } else if (!st.multi) {
            setPan({ x: st.pan0.x + g.dx, y: st.pan0.y + g.dy });
          }
        },
        onPanResponderRelease: () => {
          const st = gesture.current;
          if (!st.multi && st.moved < 10 && Date.now() - st.start < 500) onTap(st.x0, st.y0);
        },
      }),
    []
  );

  function onTap(sx, sy) {
    const { track, draft, zoom, pan, W, H } = live.current;
    if (!track) return;
    const v = makeView(track, W, H, zoom, pan);
    const w = v.toWorld(sx, sy);
    const near = findLineNear({ ...track, ...draft }, w, 22 / v.k);
    if (near) {
      setPicked(near);
      setMarker(null);
      return;
    }
    setPicked(null);
    setMarker(nearestCenterIndex(track.center, w).index);
  }

  const change = (d) => { setDraft(d); setDirty(true); };

  const addStart = () => {
    if (draft.start) return setMsg('Υπάρχει ήδη αφετηρία. Σβήσε την πρώτα.');
    if (marker === null) return setMsg('Ακούμπησε πρώτα ένα σημείο στην πίστα.');
    if (tooCloseToExisting({ ...track, ...draft }, marker)) return setMsg('Υπάρχει ήδη γραμμή πολύ κοντά.');
    change({ ...draft, start: makeLineAt(track.center, marker) });
    setMarker(null);
  };

  const addSector = () => {
    if (marker === null) return setMsg('Ακούμπησε πρώτα ένα σημείο στην πίστα.');
    if (tooCloseToExisting({ ...track, ...draft }, marker)) return setMsg('Υπάρχει ήδη γραμμή πολύ κοντά.');
    change({ ...draft, sectors: [...draft.sectors, makeLineAt(track.center, marker)] });
    setMarker(null);
  };

  const removePicked = () => {
    if (!picked) return;
    if (picked.kind === 'start') change({ ...draft, start: null });
    else change({ ...draft, sectors: draft.sectors.filter((l) => l !== picked.line) });
    setPicked(null);
  };

  const finish = async () => {
    const t = { ...track, start: draft.start, sectors: orderSectors({ ...track, ...draft }), direction: draft.direction };
    await saveTrack(t);
    nav.pop();
  };

  if (!track || !draft) return <Screen />;

  const v = makeView(track, W, H, zoom, pan);
  const full = { ...track, ...draft };
  const ordered = orderSectors(full);

  // Βέλος φοράς στο 1/4 της πίστας
  const n = track.center.length;
  const ai = Math.floor(n / 4);
  const from = v.toScreen(track.center[ai]);
  const to = v.toScreen(track.center[(ai + draft.direction * 8 + n) % n]);
  const ang = Math.atan2(to.y - from.y, to.x - from.x);
  const head = [
    `${to.x},${to.y}`,
    `${to.x - 14 * Math.cos(ang - 0.5)},${to.y - 14 * Math.sin(ang - 0.5)}`,
    `${to.x - 14 * Math.cos(ang + 0.5)},${to.y - 14 * Math.sin(ang + 0.5)}`,
  ].join(' ');

  const drawLine = (line, color, label, key) => {
    const a = v.toScreen(line.a), b = v.toScreen(line.b);
    const isPicked = picked && picked.line === line;
    return (
      <React.Fragment key={key}>
        <Line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={isPicked ? '#FF5252' : color} strokeWidth={isPicked ? 7 : 5} />
        <SvgText x={a.x + 4} y={a.y - 4} fill={color} fontSize="16" fontWeight="bold">{label}</SvgText>
      </React.Fragment>
    );
  };

  const title = (
    <Text style={{ color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 6 }}>Γραμμές — {track.name}</Text>
  );
  const map = (
      <View
        style={{ width: W, height: H, backgroundColor: '#0B0E11', borderRadius: 12, overflow: 'hidden' }}
        {...responder.panHandlers}
      >
        <Svg width={W} height={H} pointerEvents="none">
          <Polyline points={pts([...track.outer, track.outer[0]], v)} fill="none" stroke="#56606E" strokeWidth={2} />
          <Polyline points={pts([...track.inner, track.inner[0]], v)} fill="none" stroke="#56606E" strokeWidth={2} />
          <Polyline points={pts([...track.center, track.center[0]], v)} fill="none" stroke="#8A96A6" strokeWidth={1} strokeDasharray="6,6" />
          <Line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={C.accent} strokeWidth={4} />
          <Polygon points={head} fill={C.accent} />
          {draft.start ? drawLine(draft.start, '#4CAF50', 'ΑΦΕΤΗΡΙΑ', 'start') : null}
          {ordered.map((l, i) => drawLine(l, '#FFD54F', `S${i + 1}`, 's' + l.index))}
          {marker !== null ? (
            <Circle cx={v.toScreen(track.center[marker]).x} cy={v.toScreen(track.center[marker]).y} r={9} fill="#FFFFFF" stroke={C.accent} strokeWidth={3} />
          ) : null}
        </Svg>
      </View>
  );
  const controls = (
    <>
      <Text style={{ color: C.dim, fontSize: 14, marginVertical: 6 }}>
        Ακούμπα σημείο · 2 δάχτυλα για ζουμ · σύρε για μετακίνηση
      </Text>
      {picked ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <BigButton label="Σβήσιμο" color={C.red} onPress={removePicked} style={{ flex: 1, marginRight: 6 }} />
          <BigButton label="Άκυρο" onPress={() => setPicked(null)} style={{ flex: 1, marginLeft: 6 }} />
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <BigButton label="Αφετηρία" color="#2E7D32" onPress={addStart} style={{ flex: 1, marginRight: 4 }} textStyle={{ fontSize: 18 }} />
          <BigButton label="Sector" color="#8D6E00" onPress={addSector} style={{ flex: 1, marginHorizontal: 4 }} textStyle={{ fontSize: 18 }} />
          <BigButton label="Φορά ⇄" onPress={() => change({ ...draft, direction: -draft.direction })} style={{ flex: 1, marginLeft: 4 }} textStyle={{ fontSize: 18 }} />
        </View>
      )}
      <BigButton label="Ολοκλήρωση" color={C.green} onPress={finish} />
    </>
  );

  return (
    <Screen>
      {land ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {map}
          <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>
            {title}
            {controls}
          </View>
        </View>
      ) : (
        <>
          {title}
          {map}
          {controls}
        </>
      )}
      <Notice visible={!!msg} message={msg} onClose={() => setMsg(null)} />
      <Confirm
        visible={askLeave}
        title="Έξοδος;"
        message="Οι αλλαγές δεν έχουν αποθηκευτεί."
        safeLabel="Μένω"
        dangerLabel="έξοδος χωρίς αποθήκευση"
        onSafe={() => setAskLeave(false)}
        onDanger={() => nav.pop()}
      />
    </Screen>
  );
}

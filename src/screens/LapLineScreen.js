// 5β. Πορεία γύρου: ο γύρος πάνω στον χάρτη της πίστας, με χρώμα ανάλογα με την ταχύτητα.
//     Δύο δάχτυλα = ζουμ, ένα δάχτυλο = μετακίνηση. ◀ ▶ = άλλος γύρος.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, PanResponder, useWindowDimensions } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { Screen, SmallButton, C } from '../ui';
import { getSessions, getTrack } from '../storage';
import { formatTime } from '../core/timing';
import { speedSegments, speedRange, speedColor, SLOW, MID, FAST } from '../core/lapLine';
import { makeView, pts } from '../mapView';
import { bestLap } from './SummaryScreen';

export default function LapLineScreen({ nav, params }) {
  const { width, height } = useWindowDimensions();
  const land = width > height;
  // Όρθιο: χάρτης πάνω σε όλο το πλάτος. Ξαπλωτό: χάρτης αριστερά σε όλο το ύψος.
  const W = land ? Math.round(width * 0.65) : width - 36;
  const H = land ? height - 48 : Math.max(280, height - 300);

  const [session, setSession] = useState(null);
  const [track, setTrack] = useState(null);
  const [lapN, setLapN] = useState(params.lapN);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  useEffect(() => {
    (async () => {
      const all = await getSessions();
      const sess = all.find((x) => x.id === params.sessionId) || null;
      setSession(sess);
      if (sess) setTrack(await getTrack(sess.trackId));
    })();
  }, []);

  // Ζουμ με δύο δάχτυλα, μετακίνηση με ένα (όπως στις Γραμμές)
  const live = useRef({ zoom: 1, pan: { x: 0, y: 0 } });
  live.current = { zoom, pan };
  const gesture = useRef({});
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const t = e.nativeEvent.touches;
          gesture.current = {
            zoom0: live.current.zoom,
            pan0: live.current.pan,
            d0: t.length > 1 ? Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY) : null,
            multi: t.length > 1,
          };
        },
        onPanResponderMove: (e, g) => {
          const t = e.nativeEvent.touches;
          const st = gesture.current;
          if (t.length > 1) {
            const d = Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
            if (!st.d0) { st.d0 = d; st.zoom0 = live.current.zoom; }
            st.multi = true;
            setZoom(Math.min(30, Math.max(1, (st.zoom0 * d) / st.d0)));
          } else if (!st.multi) {
            setPan({ x: st.pan0.x + g.dx, y: st.pan0.y + g.dy });
          }
        },
      }),
    []
  );

  if (!session || !track) return <Screen />;

  const laps = session.laps;
  const idx = laps.findIndex((l) => l.n === lapN);
  const lap = laps[idx];
  const best = bestLap(session);
  const segs = speedSegments(lap.line);
  const range = speedRange(segs);
  const v = makeView(track, W, H, zoom, pan);
  // Πιο χοντρή γραμμή όσο μεγαλώνει το ζουμ, αλλά όχι υπερβολικά
  const sw = Math.min(8, 3 + zoom * 0.5);

  const map = (
    <View {...responder.panHandlers} style={{ width: W, height: H, backgroundColor: C.card, borderRadius: 10, overflow: 'hidden' }}>
      <Svg width={W} height={H}>
        {/* Οι άκρες της πίστας */}
        <Polyline points={pts([...track.inner, track.inner[0]], v)} fill="none" stroke="#555" strokeWidth={2} />
        <Polyline points={pts([...track.outer, track.outer[0]], v)} fill="none" stroke="#555" strokeWidth={2} />
        {/* Η γραμμή εκκίνησης */}
        {track.start ? (
          <Line
            x1={v.toScreen(track.start.a).x} y1={v.toScreen(track.start.a).y}
            x2={v.toScreen(track.start.b).x} y2={v.toScreen(track.start.b).y}
            stroke="#fff" strokeWidth={4}
          />
        ) : null}
        {/* Η πορεία, κομμάτι-κομμάτι με το χρώμα της ταχύτητας */}
        {segs.map((s, i) => {
          const a = v.toScreen(s.a), b = v.toScreen(s.b);
          return <Line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={speedColor(s.kmh, range)} strokeWidth={sw} strokeLinecap="round" />;
        })}
        {/* Τα σημάδια GPS, όταν κάνεις αρκετό ζουμ */}
        {zoom > 3
          ? (lap.line || []).map(([x, y], i) => {
              const q = v.toScreen({ x, y });
              return <Circle key={'p' + i} cx={q.x} cy={q.y} r={3} fill="#fff" />;
            })
          : null}
      </Svg>
      {segs.length === 0 ? (
        <Text style={{ position: 'absolute', top: H / 2 - 30, left: 20, right: 20, color: C.dim, fontSize: 18, textAlign: 'center' }}>
          Αυτός ο γύρος δεν έχει πορεία.{'\n'}Η πορεία καταγράφεται στα νέα sessions.
        </Text>
      ) : null}
    </View>
  );

  const go = (d) => {
    const next = laps[idx + d];
    if (next) setLapN(next.n);
  };

  const controls = (
    <>
      {/* Ποιος γύρος, με βελάκια για τον προηγούμενο/επόμενο */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
        <SmallButton label="◀" onPress={() => go(-1)} disabled={idx === 0} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>Γύρος {lap.n}</Text>
          <Text style={{ color: lap === best ? C.accent : C.text, fontSize: 22, fontVariant: ['tabular-nums'] }}>
            {formatTime(lap.time)} {lap === best ? '★' : ''}
          </Text>
        </View>
        <SmallButton label="▶" onPress={() => go(1)} disabled={idx === laps.length - 1} />
      </View>
      {/* Υπόμνημα χρωμάτων */}
      {segs.length ? (
        <Text style={{ color: C.dim, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
          <Text style={{ color: SLOW }}>● αργά</Text>   <Text style={{ color: MID }}>● μέτρια</Text>   <Text style={{ color: FAST }}>● γρήγορα</Text>
          {'\n'}{Math.round(range.min)}–{Math.round(range.max)} km/h
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SmallButton label="Πίσω" onPress={() => nav.pop()} />
        {zoom > 1 || pan.x || pan.y ? (
          <SmallButton label="Όλη η πίστα" onPress={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} />
        ) : null}
      </View>
    </>
  );

  return (
    <Screen>
      {land ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {map}
          <View style={{ flex: 1, marginLeft: 14, justifyContent: 'center' }}>{controls}</View>
        </View>
      ) : (
        <>
          {map}
          {controls}
        </>
      )}
    </Screen>
  );
}

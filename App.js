// Kart Coach — η «πόρτα» της εφαρμογής.
// Κρατάμε μια στοίβα από οθόνες, σαν στοίβα χαρτιά: η πάνω-πάνω φαίνεται.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StatusBar } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NavigationBar } from 'expo-navigation-bar';

import HomeScreen from './src/screens/HomeScreen';
import SelectTrackScreen from './src/screens/SelectTrackScreen';
import MappingScreen from './src/screens/MappingScreen';
import ManageScreen from './src/screens/ManageScreen';
import LinesScreen from './src/screens/LinesScreen';
import TimingScreen from './src/screens/TimingScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import AnalyticScreen from './src/screens/AnalyticScreen';
import HistoryScreen from './src/screens/HistoryScreen';

const SCREENS = {
  Home: HomeScreen,
  SelectTrack: SelectTrackScreen,
  Mapping: MappingScreen,
  Manage: ManageScreen,
  Lines: LinesScreen,
  Timing: TimingScreen,
  Summary: SummaryScreen,
  Analytic: AnalyticScreen,
  History: HistoryScreen,
};


export default function App() {
  const [stack, setStack] = useState([{ name: 'Home', params: {}, key: 'home' }]);
  const backHandler = useRef(null);
  const top = stack[stack.length - 1];

  const nav = useMemo(() => {
    // Κάθε αλλαγή οθόνης «ξεχνά» τον χειρισμό του Πίσω της προηγούμενης
    const go = (fn) => {
      backHandler.current = null;
      setStack(fn);
    };
    return {
      push: (name, params = {}) => go((st) => [...st, { name, params, key: name + Date.now() }]),
      replace: (name, params = {}) =>
        go((st) => [...st.slice(0, -1), { name, params, key: name + Date.now() }]),
      pop: () => go((st) => (st.length > 1 ? st.slice(0, -1) : st)),
      home: () => go(() => [{ name: 'Home', params: {}, key: 'home' + Date.now() }]),
      // Μια οθόνη μπορεί να «πιάσει» το κουμπί Πίσω του κινητού (π.χ. για επιβεβαίωση)
      setBackHandler: (fn) => {
        backHandler.current = fn;
      },
    };
  }, []);

  // Όλες οι οθόνες γυρίζουν ελεύθερα: όρθια ή ξαπλωτά, όπως κρατάς το κινητό/τάμπλετ
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => {});
  }, []);

  const onBack = useCallback(() => {
    if (backHandler.current) {
      backHandler.current();
      return true;
    }
    if (stack.length > 1) {
      nav.pop();
      return true;
    }
    return false; // στην αρχική: κλείνει η εφαρμογή
  }, [stack.length, nav]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [onBack]);

  const Comp = SCREENS[top.name];
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#111418" hidden={top.name === 'Timing'} />
      {/* Κρύβουμε τα 3 κουμπιά του Android σε όλες τις οθόνες.
          Αν τα χρειαστείς, σύρε το δάχτυλο από την άκρη και εμφανίζονται για λίγο. */}
      <NavigationBar hidden />
      <Comp key={top.key} nav={nav} params={top.params} />
    </>
  );
}

// Κοινά «τουβλάκια» για όλες τις οθόνες: κουμπιά, τίτλοι, παράθυρο επιβεβαίωσης.
import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';

export const C = {
  bg: '#111418',
  card: '#1C2128',
  text: '#F2F4F7',
  dim: '#9AA4B2',
  accent: '#F5B400', // κίτρινο σαν σημαία
  green: '#1E9E4A',
  red: '#C62828',
  line: '#2C333D',
};

// Είναι το κινητό ξαπλωμένο; (πλάτος μεγαλύτερο από ύψος)
export function useLandscape() {
  const { width, height } = useWindowDimensions();
  return width > height;
}

// Η «σελίδα» κάθε οθόνης.
// scroll: αν δεν χωράνε όλα, η σελίδα κυλάει πάνω-κάτω με το δάχτυλο.
export function Screen({ children, style, scroll }) {
  const land = useLandscape();
  const pad = land ? s.screenLand : null; // ξαπλωτό: λιγότερο κενό πάνω
  if (scroll) {
    return (
      <ScrollView
        style={[{ flex: 1, backgroundColor: C.bg }, style]}
        contentContainerStyle={[s.screen, pad, { flex: 0, flexGrow: 1, backgroundColor: 'transparent' }]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    );
  }
  return <View style={[s.screen, pad, style]}>{children}</View>;
}

// Λίστα που κυλάει μόνη της όταν το κινητό είναι όρθιο.
// Όταν είναι ξαπλωμένο, κυλάει όλη η σελίδα (Screen scroll), οπότε η λίστα απλώνεται.
export function List({ children, style }) {
  const land = useLandscape();
  if (land) return <View style={style}>{children}</View>;
  return <ScrollView style={[{ flex: 1 }, style]}>{children}</ScrollView>;
}

export function Title({ children, sub }) {
  return (
    <View style={s.titleBox}>
      <Text style={s.title}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function BigButton({ label, onPress, color, style, textStyle, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.big,
        { backgroundColor: color || C.card, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={[s.bigText, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function SmallButton({ label, onPress, style, color, disabled }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [s.small, { backgroundColor: color || C.card, opacity: disabled ? 0.3 : pressed ? 0.7 : 1 }, style]}
    >
      <Text style={s.smallText}>{label}</Text>
    </Pressable>
  );
}

// Επιβεβαίωση: το ασφαλές κουμπί είναι το ΜΕΓΑΛΟ, το επικίνδυνο το μικρό.
export function Confirm({ visible, title, message, safeLabel, dangerLabel, onSafe, onDanger }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSafe} supportedOrientations={['portrait', 'landscape']}>
      <View style={s.backdrop}>
        <View style={s.dialog}>
          <Text style={s.dTitle}>{title}</Text>
          {message ? <Text style={s.dMsg}>{message}</Text> : null}
          <BigButton label={safeLabel} onPress={onSafe} color={C.green} />
          <SmallButton label={dangerLabel} onPress={onDanger} color={C.red} style={{ alignSelf: 'center', marginTop: 14 }} />
        </View>
      </View>
    </Modal>
  );
}

// Απλό μήνυμα με ένα κουμπί «ΟΚ»
export function Notice({ visible, message, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={s.backdrop}>
        <View style={s.dialog}>
          <Text style={s.dMsg}>{message}</Text>
          <BigButton label="ΟΚ" onPress={onClose} color={C.accent} textStyle={{ color: '#111' }} />
        </View>
      </View>
    </Modal>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 18, paddingTop: 44, paddingBottom: 18 },
  screenLand: { paddingTop: 24, paddingHorizontal: 28 },
  titleBox: { marginBottom: 18 },
  title: { color: C.text, fontSize: 28, fontWeight: '800' },
  sub: { color: C.accent, fontSize: 20, marginTop: 4, fontWeight: '600' },
  big: { borderRadius: 14, paddingVertical: 20, paddingHorizontal: 16, marginVertical: 7, alignItems: 'center' },
  bigText: { color: C.text, fontSize: 22, fontWeight: '700' },
  small: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14, alignItems: 'center' },
  smallText: { color: C.text, fontSize: 15, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: C.card, borderRadius: 16, padding: 22, maxWidth: 480, width: '100%', alignSelf: 'center' },
  dTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  dMsg: { color: C.text, fontSize: 19, marginBottom: 16, lineHeight: 26 },
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { backgroundColor: C.card, borderRadius: 12, padding: 18, marginVertical: 5 },
  itemText: { color: C.text, fontSize: 20 },
  empty: { color: C.dim, fontSize: 18, textAlign: 'center', marginTop: 30, lineHeight: 26 },
});

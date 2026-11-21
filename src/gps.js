// Σύνδεση με το GPS του κινητού.
import * as Location from 'expo-location';

export async function askPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

// Ξεκινά να δίνει σημάδια GPS (περίπου 1 το δευτερόλεπτο).
// Επιστρέφει συνάρτηση που το σταματά.
export async function watchGps(onFix, onError) {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 0,
      mayShowUserSettingsDialog: true,
    },
    (loc) => {
      const c = loc.coords;
      onFix({
        lat: c.latitude,
        lon: c.longitude,
        t: loc.timestamp,
        speed: c.speed !== null && c.speed >= 0 ? c.speed : null, // μέτρα/δευτ.
        accuracy: c.accuracy,
        received: Date.now(),
      });
    },
    onError
  );
  return () => sub.remove();
}

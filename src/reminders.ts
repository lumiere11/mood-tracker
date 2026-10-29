import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';

export interface Reminders {
  enabled: boolean;
  times: string[]; // 'HH:mm', 24 h
}

const KEY = 'stress-tracker:reminders';
export const DEFAULT: Reminders = { enabled: false, times: ['10:00', '15:00', '20:00'] };
export const MAX_TIMES = 6;
export const isNative = Capacitor.isNativePlatform();

export async function loadReminders(): Promise<Reminders> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    const r = value ? JSON.parse(value) : null;
    return r && Array.isArray(r.times) ? { enabled: !!r.enabled, times: r.times } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export const saveReminders = (r: Reminders) => Preferences.set({ key: KEY, value: JSON.stringify(r) });

/** Notificaciones diarias a las horas elegidas. Devuelve 'denied' si el usuario rechaza el permiso. */
export async function applyReminders(r: Reminders): Promise<'ok' | 'denied' | 'web'> {
  if (!isNative) return 'web';

  const { notifications } = await LocalNotifications.getPending();
  if (notifications.length) await LocalNotifications.cancel({ notifications });
  if (!r.enabled || !r.times.length) return 'ok';

  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
  if (perm.display !== 'granted') return 'denied';

  await LocalNotifications.schedule({
    notifications: r.times.map((t, i) => {
      const [hour, minute] = t.split(':').map(Number);
      return {
        id: i + 1,
        title: 'Estrés',
        body: '¿Cómo va tu estrés ahora? Registra tu nivel.',
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      };
    }),
  });
  return 'ok';
}

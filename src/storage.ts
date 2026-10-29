import { Preferences } from '@capacitor/preferences';
import type { Entry } from './types';

const KEY = 'stress-tracker:v1';

export async function loadEntries(): Promise<Entry[]> {
  try {
    const { value } = await Preferences.get({ key: KEY });
    const data = value ? JSON.parse(value) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const saveEntries = (entries: Entry[]) =>
  Preferences.set({ key: KEY, value: JSON.stringify(entries) });

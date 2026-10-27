export interface Entry {
  id: string;
  ts: string; // ISO
  mood: number; // 1..5
  note: string;
}

export const MOODS = [
  { v: 1, e: '😞', t: 'Muy mal' },
  { v: 2, e: '😕', t: 'Mal' },
  { v: 3, e: '😐', t: 'Normal' },
  { v: 4, e: '🙂', t: 'Bien' },
  { v: 5, e: '😄', t: 'Muy bien' },
] as const;

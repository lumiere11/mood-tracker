import type { Entry } from './types';

export type Range = 'day' | 'week' | 'month';

export const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es', opts);
export const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Fecha local en formato `YYYY-MM-DDTHH:mm`, el que usa IonDatetime. */
export const localISO = (d: Date) => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export interface Period {
  start: Date;
  label: string;
  items: Entry[];
}

export function getPeriod(entries: Entry[], range: Range, offset: number): Period {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let start: Date, end: Date, label: string;

  if (range === 'day') {
    start = new Date(now);
    start.setDate(start.getDate() + offset);
    end = new Date(start);
    end.setDate(end.getDate() + 1);
    label = offset === 0 ? 'Hoy' : offset === -1 ? 'Ayer'
      : fmt({ weekday: 'long', day: 'numeric', month: 'short' }).format(start);
  } else if (range === 'week') {
    start = new Date(now);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7); // lunes
    end = new Date(start);
    end.setDate(end.getDate() + 7);
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const short = fmt({ day: 'numeric', month: 'short' });
    label = `${short.format(start)} – ${short.format(last)}`;
  } else {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    label = fmt({ month: 'long', year: 'numeric' }).format(start);
  }

  const items = entries.filter((e) => {
    const t = new Date(e.ts);
    return t >= start && t < end;
  });
  return { start, label: label[0].toUpperCase() + label.slice(1), items };
}

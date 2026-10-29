import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { levelLabel, type Entry } from './types';
import { dayKey, pad } from './period';

export type Format = 'csv' | 'json';

const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

function build(entries: Entry[], format: Format) {
  if (format === 'json') return { mime: 'application/json', data: JSON.stringify(entries, null, 2) };
  const rows = entries.map((e) => {
    const d = new Date(e.ts);
    return [dayKey(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`, e.level, levelLabel(e.level), q(e.tags.join('; ')), q(e.note)].join(',');
  });
  // BOM para que Excel abra bien los acentos.
  return { mime: 'text/csv;charset=utf-8', data: '﻿' + ['fecha,hora,nivel,etiqueta,desencadenantes,nota', ...rows].join('\r\n') };
}

/** Exporta el historial. En Android abre el menú "Compartir" (Drive, Archivos, correo…); en web descarga el fichero. */
export async function exportEntries(entries: Entry[], format: Format) {
  const name = `estres-${dayKey(new Date())}.${format}`;
  const { mime, data } = build(entries, format);

  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({ path: name, data, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, files: [uri], dialogTitle: 'Exportar historial' });
    return;
  }
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

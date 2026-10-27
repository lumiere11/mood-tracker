'use strict';

const KEY = 'mood-tracker:v1';
const MOODS = [
  { v: 1, e: '😞', t: 'Muy mal' },
  { v: 2, e: '😕', t: 'Mal' },
  { v: 3, e: '😐', t: 'Normal' },
  { v: 4, e: '🙂', t: 'Bien' },
  { v: 5, e: '😄', t: 'Muy bien' },
];
const PAGE = 20;

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmt = (opts) => new Intl.DateTimeFormat('es', opts);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;

let entries = load();
let range = 'day';
let offset = 0;
let shown = PAGE;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(entries)); }
  catch { toast('No se pudo guardar'); }
}
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1600);
}

/* ---------- registro ---------- */
function add(mood) {
  const when = $('when').value ? new Date($('when').value) : new Date();
  if (isNaN(when)) return toast('Fecha inválida');
  entries.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: when.toISOString(),
    mood,
    note: $('note').value.trim(),
  });
  entries.sort((a, b) => a.ts.localeCompare(b.ts));
  save();
  $('note').value = '';
  $('when').value = '';
  if (navigator.vibrate) navigator.vibrate(15);
  toast('Guardado');
  render();
}

function remove(id) {
  entries = entries.filter((e) => e.id !== id);
  save();
  render();
}

/* ---------- periodos ---------- */
function period() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let start, end, label;
  if (range === 'day') {
    start = new Date(now); start.setDate(start.getDate() + offset);
    end = new Date(start); end.setDate(end.getDate() + 1);
    label = offset === 0 ? 'Hoy' : offset === -1 ? 'Ayer'
      : fmt({ weekday: 'long', day: 'numeric', month: 'short' }).format(start);
  } else if (range === 'week') {
    start = new Date(now);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + offset * 7); // lunes
    end = new Date(start); end.setDate(end.getDate() + 7);
    const last = new Date(end); last.setDate(last.getDate() - 1);
    label = `${fmt({ day: 'numeric' }).format(start)} – ${fmt({ day: 'numeric', month: 'short' }).format(last)}`;
  } else {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    label = fmt({ month: 'long', year: 'numeric' }).format(start);
  }
  const items = entries.filter((e) => {
    const t = new Date(e.ts);
    return t >= start && t < end;
  });
  return { start, end, label, items };
}

/* ---------- gráficas (SVG) ---------- */
const NS = 'http://www.w3.org/2000/svg';
const W = 600, H = 220, M = { l: 22, r: 8, t: 10, b: 24 };
const X0 = M.l, X1 = W - M.r, Y0 = H - M.b, Y1 = M.t;
const y = (v) => Y0 - (v / 5) * (Y0 - Y1);

function el(tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (text != null) n.textContent = text;
  return n;
}

function drawChart({ start, items }) {
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Gráfica de ánimo' });
  for (let v = 1; v <= 5; v++) {
    svg.append(el('line', { class: 'grid', x1: X0, x2: X1, y1: y(v), y2: y(v) }));
    svg.append(el('text', { x: 0, y: y(v) + 4 }, v));
  }
  if (!items.length) {
    svg.append(el('text', { class: 'empty', x: W / 2, y: H / 2 }, 'Sin registros'));
    return svg;
  }

  if (range === 'day') {
    const x = (d) => X0 + ((d.getHours() * 60 + d.getMinutes()) / 1440) * (X1 - X0);
    for (const h of [0, 6, 12, 18, 24]) {
      svg.append(el('text', { x: X0 + (h / 24) * (X1 - X0), y: H - 6, 'text-anchor': h === 0 ? 'start' : h === 24 ? 'end' : 'middle' }, `${pad(h)}h`));
    }
    const pts = items.map((e) => [x(new Date(e.ts)), y(e.mood)]);
    if (pts.length > 1) svg.append(el('polyline', { class: 'line', points: pts.map((p) => p.join(',')).join(' ') }));
    pts.forEach(([cx, cy]) => svg.append(el('circle', { class: 'dot', cx, cy, r: 5 })));
    return svg;
  }

  const n = range === 'week' ? 7 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const slot = (X1 - X0) / n;
  const bw = Math.min(range === 'week' ? 32 : 12, slot * 0.7);
  const buckets = Array.from({ length: n }, () => []);
  for (const e of items) {
    const d = new Date(e.ts);
    const i = range === 'week' ? Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 864e5) : d.getDate() - 1;
    if (buckets[i]) buckets[i].push(e.mood);
  }
  const names = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  buckets.forEach((b, i) => {
    const cx = X0 + slot * i + slot / 2;
    if (b.length) {
      const top = y(mean(b));
      svg.append(el('rect', { class: 'bar', x: cx - bw / 2, y: top, width: bw, height: Y0 - top, rx: 3 }));
    }
    if (range === 'week' || i === 0 || (i + 1) % 5 === 0) {
      svg.append(el('text', { x: cx, y: H - 6, 'text-anchor': 'middle' }, range === 'week' ? names[i] : i + 1));
    }
  });
  return svg;
}

/* ---------- render ---------- */
function render() {
  const p = period();
  $('label').textContent = p.label[0].toUpperCase() + p.label.slice(1);
  $('next').disabled = offset >= 0;
  $('chart').replaceChildren(drawChart(p));
  $('count').textContent = p.items.length;
  $('avg').textContent = p.items.length ? mean(p.items.map((e) => e.mood)).toFixed(1) : '–';
  renderHistory();
}

function renderHistory() {
  const list = $('history');
  const recent = [...entries].reverse();
  list.replaceChildren();
  if (!recent.length) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="muted">Aún no hay registros.</span>';
    list.append(li);
  }
  for (const e of recent.slice(0, shown)) {
    const m = MOODS[e.mood - 1];
    const li = document.createElement('li');
    const emoji = Object.assign(document.createElement('span'), { className: 'e', textContent: m.e });
    const t = document.createElement('div');
    t.className = 't';
    const small = document.createElement('small');
    small.textContent = fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(e.ts));
    const note = document.createElement('span');
    note.textContent = e.note || m.t;
    t.append(small, note);
    const del = Object.assign(document.createElement('button'), { className: 'del', textContent: '✕', ariaLabel: 'Eliminar' });
    del.onclick = () => confirm('¿Eliminar este registro?') && remove(e.id);
    li.append(emoji, t, del);
    list.append(li);
  }
  $('more').hidden = recent.length <= shown;
}

/* ---------- exportar ---------- */
function download(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData(kind) {
  if (!entries.length) return toast('No hay nada que exportar');
  const stamp = dayKey(new Date());
  if (kind === 'json') {
    download(`mood-${stamp}.json`, 'application/json', JSON.stringify(entries, null, 2));
  } else {
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = entries.map((e) => {
      const d = new Date(e.ts);
      return [dayKey(d), `${pad(d.getHours())}:${pad(d.getMinutes())}`, e.mood, MOODS[e.mood - 1].t, q(e.note)].join(',');
    });
    download(`mood-${stamp}.csv`, 'text/csv;charset=utf-8', '﻿' + ['fecha,hora,estado,etiqueta,nota', ...rows].join('\r\n'));
  }
  toast('Exportado');
}

/* ---------- init ---------- */
$('today').textContent = fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
MOODS.forEach((m) => {
  const b = Object.assign(document.createElement('button'), { textContent: m.e, ariaLabel: m.t, title: m.t });
  b.onclick = () => add(m.v);
  $('moods').append(b);
});
document.querySelectorAll('[data-range]').forEach((b) => {
  b.onclick = () => {
    range = b.dataset.range;
    offset = 0;
    document.querySelectorAll('[data-range]').forEach((o) => o.setAttribute('aria-selected', o === b));
    render();
  };
});
$('prev').onclick = () => { offset--; render(); };
$('next').onclick = () => { if (offset < 0) { offset++; render(); } };
$('more').onclick = () => { shown += PAGE; renderHistory(); };
$('csv').onclick = () => exportData('csv');
$('json').onclick = () => exportData('json');
render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});

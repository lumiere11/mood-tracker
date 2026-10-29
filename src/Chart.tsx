import { levelColor } from './types';
import { mean, pad, type Period, type Range } from './period';

const W = 600, H = 220;
const M = { l: 22, r: 8, t: 10, b: 24 };
const X0 = M.l, X1 = W - M.r, Y0 = H - M.b, Y1 = M.t;
const y = (v: number) => Y0 - (v / 10) * (Y0 - Y1);
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function Chart({ range, period }: { range: Range; period: Period }) {
  const { start, items } = period;
  const parts: React.ReactNode[] = [];

  for (const v of [2, 4, 6, 8, 10]) {
    parts.push(<line key={`g${v}`} className="grid" x1={X0} x2={X1} y1={y(v)} y2={y(v)} />);
    parts.push(<text key={`y${v}`} x={0} y={y(v) + 4}>{v}</text>);
  }

  if (!items.length) {
    parts.push(<text key="empty" className="empty" x={W / 2} y={H / 2}>Sin registros</text>);
  } else if (range === 'day') {
    const x = (d: Date) => X0 + ((d.getHours() * 60 + d.getMinutes()) / 1440) * (X1 - X0);
    for (const h of [0, 6, 12, 18, 24]) {
      parts.push(
        <text key={`h${h}`} x={X0 + (h / 24) * (X1 - X0)} y={H - 6}
          textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}>{pad(h)}h</text>,
      );
    }
    const pts = items.map((e) => ({ cx: x(new Date(e.ts)), cy: y(e.level), level: e.level }));
    if (pts.length > 1) parts.push(<polyline key="line" className="line" points={pts.map((p) => `${p.cx},${p.cy}`).join(' ')} />);
    pts.forEach((p, i) => parts.push(<circle key={`p${i}`} className="dot" cx={p.cx} cy={p.cy} r={6} style={{ fill: levelColor(p.level) }} />));
  } else {
    const n = range === 'week' ? 7 : new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const slot = (X1 - X0) / n;
    const bw = Math.min(range === 'week' ? 32 : 12, slot * 0.7);
    const buckets: number[][] = Array.from({ length: n }, () => []);
    for (const e of items) {
      const d = new Date(e.ts);
      const i = range === 'week'
        ? Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start.getTime()) / 864e5)
        : d.getDate() - 1;
      buckets[i]?.push(e.level);
    }
    buckets.forEach((b, i) => {
      const cx = X0 + slot * i + slot / 2;
      if (b.length) {
        const avg = mean(b);
        const peak = Math.max(...b);
        parts.push(<rect key={`b${i}`} className="bar" x={cx - bw / 2} y={y(avg)} width={bw} height={Y0 - y(avg)} rx={3} style={{ fill: levelColor(avg) }} />);
        if (peak > avg + 0.05) parts.push(<circle key={`k${i}`} className="peak" cx={cx} cy={y(peak)} r={Math.min(4, bw / 2)} />);
      }
      if (range === 'week' || i === 0 || (i + 1) % 5 === 0) {
        parts.push(<text key={`x${i}`} x={cx} y={H - 6} textAnchor="middle">{range === 'week' ? WEEKDAYS[i] : i + 1}</text>);
      }
    });
  }

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Gráfica de nivel de estrés">
      {parts}
    </svg>
  );
}

export interface Entry {
  id: string;
  ts: string; // ISO
  level: number; // 1..10
  tags: string[];
  note: string;
}

export const TAGS = ['Trabajo', 'Familia', 'Dinero', 'Salud', 'Sueño', 'Social', 'Tráfico', 'Otro'];

export const levelLabel = (n: number) => (n <= 3 ? 'Bajo' : n <= 6 ? 'Moderado' : n <= 8 ? 'Alto' : 'Muy alto');

/** De azul (calma) a rojo-naranja (estrés alto). Siempre va acompañado del número. */
export const levelColor = (n: number) => {
  const t = (Math.min(10, Math.max(1, n)) - 1) / 9;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t);
  return `rgb(${mix(79, 214)} ${mix(124, 76)} ${mix(172, 60)})`;
};

import { useEffect, useMemo, useState } from 'react';
import {
  IonApp, IonButton, IonButtons, IonChip, IonContent, IonDatetime, IonHeader, IonIcon, IonInput,
  IonItem, IonLabel, IonList, IonPage, IonRange, IonSegment, IonSegmentButton, IonTitle, IonToggle, IonToolbar,
  useIonAlert, useIonToast,
} from '@ionic/react';
import { chevronBack, chevronForward, close } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Chart from './Chart';
import { exportEntries, type Format } from './exporter';
import { fmt, getPeriod, localISO, mean, type Range } from './period';
import { DEFAULT, MAX_TIMES, applyReminders, isNative, loadReminders, saveReminders, type Reminders } from './reminders';
import { loadEntries, saveEntries } from './storage';
import { TAGS, levelColor, levelLabel, type Entry } from './types';

const PAGE = 20;

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [range, setRange] = useState<Range>('day');
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [level, setLevel] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [rem, setRem] = useState<Reminders>(DEFAULT);
  const [addingTime, setAddingTime] = useState(false);
  const [newTime, setNewTime] = useState('12:00');
  const [toast] = useIonToast();
  const [alert] = useIonAlert();

  useEffect(() => {
    loadEntries().then(setEntries);
    loadReminders().then(setRem);
  }, []);

  const period = useMemo(() => getPeriod(entries, range, offset), [entries, range, offset]);
  const say = (message: string) => toast({ message, duration: 1500, position: 'bottom' });

  const commit = (next: Entry[]) => {
    setEntries(next);
    saveEntries(next).catch(() => say('No se pudo guardar'));
  };

  const add = () => {
    const date = when ? new Date(when) : new Date();
    if (isNaN(date.getTime())) return say('Fecha inválida');
    const entry: Entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: date.toISOString(),
      level,
      tags,
      note: note.trim(),
    };
    commit([...entries, entry].sort((a, b) => a.ts.localeCompare(b.ts)));
    setTags([]);
    setNote('');
    setWhen(null);
    setPickDate(false);
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    say('Registrado');
  };

  const updateReminders = async (next: Reminders) => {
    setRem(next);
    saveReminders(next).catch(() => say('No se pudo guardar'));
    try {
      if ((await applyReminders(next)) === 'denied') {
        const off = { ...next, enabled: false };
        setRem(off);
        saveReminders(off).catch(() => {});
        say('Permiso de notificaciones denegado. Actívalo en los ajustes del teléfono.');
      }
    } catch {
      say('No se pudieron programar los recordatorios');
    }
  };

  const addTime = () => {
    if (rem.times.includes(newTime)) return say('Esa hora ya está');
    updateReminders({ ...rem, times: [...rem.times, newTime].sort() });
    setAddingTime(false);
  };

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const confirmRemove = (id: string) =>
    alert({
      header: 'Eliminar registro',
      message: '¿Seguro que quieres eliminarlo?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => commit(entries.filter((e) => e.id !== id)) },
      ],
    });

  const doExport = async (format: Format) => {
    if (!entries.length) return say('No hay nada que exportar');
    try {
      await exportEntries(entries, format);
    } catch (err) {
      // Cerrar el menú de compartir sin elegir nada no es un error.
      if (!/cancel/i.test(String(err))) say('No se pudo exportar');
    }
  };

  const recent = useMemo(() => [...entries].reverse(), [entries]);
  const levels = period.items.map((e) => e.level);
  const avg = levels.length ? mean(levels).toFixed(1) : '–';
  const peak = levels.length ? Math.max(...levels) : '–';

  // Qué desencadenantes aparecen más en el periodo y con qué intensidad media.
  const triggers = useMemo(() => {
    const by = new Map<string, number[]>();
    for (const e of period.items) for (const t of e.tags) by.set(t, [...(by.get(t) ?? []), e.level]);
    return [...by].map(([tag, ls]) => ({ tag, n: ls.length, avg: mean(ls) })).sort((a, b) => b.n - a.n || b.avg - a.avg);
  }, [period]);

  return (
    <IonApp>
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle>Estrés</IonTitle>
            <span slot="end" className="muted" style={{ paddingInlineEnd: 16 }}>
              {fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </span>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <main className="page">
            <section>
              <p className="muted" style={{ margin: 0 }}>¿Cuánto estrés sientes ahora?</p>
              <div className="level">
                <b style={{ color: levelColor(level) }}>{level}</b>
                <span>{levelLabel(level)}</span>
              </div>
              <IonRange
                min={1} max={10} step={1} snaps ticks={false} pin
                value={level} aria-label="Nivel de estrés"
                style={{ '--bar-background-active': levelColor(level), '--knob-background': levelColor(level) } as React.CSSProperties}
                onIonInput={(e) => setLevel(Number(e.detail.value))}
              >
                <span slot="start" className="muted">1</span>
                <span slot="end" className="muted">10</span>
              </IonRange>

              <p className="muted" style={{ margin: '12px 0 0' }}>¿Qué lo provoca? (opcional)</p>
              <div className="tags">
                {TAGS.map((t) => (
                  <IonChip key={t} outline={!tags.includes(t)} color={tags.includes(t) ? 'primary' : 'medium'} onClick={() => toggleTag(t)}>
                    {t}
                  </IonChip>
                ))}
              </div>
              <IonInput
                className="field" fill="outline" placeholder="Nota (opcional)" maxlength={140}
                value={note} onIonInput={(e) => setNote(String(e.detail.value ?? ''))}
              />
              <IonButton fill="clear" size="small" color="medium" onClick={() => setPickDate((v) => !v)}>
                {pickDate ? 'Usar fecha y hora actuales' : 'Cambiar fecha y hora'}
              </IonButton>
              {pickDate && (
                <IonDatetime
                  presentation="date-time" max={localISO(new Date())}
                  value={when ?? localISO(new Date())}
                  onIonChange={(e) => setWhen(String(e.detail.value))}
                />
              )}
              <IonButton expand="block" className="save" onClick={add}>Registrar</IonButton>
            </section>

            <section>
              <IonSegment value={range} onIonChange={(e) => { setRange(e.detail.value as Range); setOffset(0); }}>
                <IonSegmentButton value="day"><IonLabel>Día</IonLabel></IonSegmentButton>
                <IonSegmentButton value="week"><IonLabel>Semana</IonLabel></IonSegmentButton>
                <IonSegmentButton value="month"><IonLabel>Mes</IonLabel></IonSegmentButton>
              </IonSegment>
              <div className="nav">
                <IonButton fill="outline" color="medium" aria-label="Anterior" onClick={() => setOffset(offset - 1)}>
                  <IonIcon slot="icon-only" icon={chevronBack} />
                </IonButton>
                <strong>{period.label}</strong>
                <IonButton fill="outline" color="medium" aria-label="Siguiente" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
                  <IonIcon slot="icon-only" icon={chevronForward} />
                </IonButton>
              </div>
              <Chart range={range} period={period} />
              {range !== 'day' && <p className="muted legend">Barra: promedio del día · punto: pico del día</p>}
              <div className="stats">
                <div><b>{avg}</b><span className="muted">promedio</span></div>
                <div><b>{peak}</b><span className="muted">pico</span></div>
                <div><b>{period.items.length}</b><span className="muted">registros</span></div>
              </div>
              {triggers.length > 0 && (
                <div className="triggers">
                  <h2>Desencadenantes</h2>
                  {triggers.map((t) => (
                    <div key={t.tag} className="trigger">
                      <span>{t.tag}</span>
                      <span className="muted">{t.n} {t.n === 1 ? 'vez' : 'veces'} · prom. {t.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="history">
              <div className="row">
                <h2>Historial</h2>
                <IonButtons>
                  <IonButton fill="outline" color="medium" size="small" onClick={() => doExport('csv')}>CSV</IonButton>
                  <IonButton fill="outline" color="medium" size="small" onClick={() => doExport('json')}>JSON</IonButton>
                </IonButtons>
              </div>
              <IonList lines="full">
                {!recent.length && <IonItem lines="none"><span className="muted">Aún no hay registros.</span></IonItem>}
                {recent.slice(0, shown).map((e) => (
                  <IonItem key={e.id}>
                    <span className="badge" style={{ background: levelColor(e.level) }}>{e.level}</span>
                    <IonLabel className="note">
                      <small>
                        {fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(e.ts))}
                        {e.tags.length > 0 && ` · ${e.tags.join(', ')}`}
                      </small>
                      {e.note || levelLabel(e.level)}
                    </IonLabel>
                    <IonButton slot="end" fill="clear" color="medium" aria-label="Eliminar" onClick={() => confirmRemove(e.id)}>
                      <IonIcon slot="icon-only" icon={close} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
              {recent.length > shown && (
                <IonButton expand="block" fill="clear" color="medium" onClick={() => setShown(shown + PAGE)}>Mostrar más</IonButton>
              )}
            </section>

            <section className="reminders">
              <div className="row">
                <h2>Recordatorios</h2>
                <IonToggle
                  checked={rem.enabled} aria-label="Activar recordatorios"
                  onIonChange={(e) => e.detail.checked !== rem.enabled && updateReminders({ ...rem, enabled: e.detail.checked })}
                />
              </div>
              {!isNative && <p className="muted">Los recordatorios funcionan en la app de Android.</p>}
              <p className="muted" style={{ margin: '4px 0 0' }}>Un aviso diario a estas horas para registrar tu nivel.</p>
              <div className="tags">
                {rem.times.map((t) => (
                  <IonChip key={t} outline color={rem.enabled ? 'primary' : 'medium'}>
                    {t}
                    <IonIcon icon={close} aria-label={`Quitar ${t}`} onClick={() => updateReminders({ ...rem, times: rem.times.filter((x) => x !== t) })} />
                  </IonChip>
                ))}
                {rem.times.length < MAX_TIMES && (
                  <IonChip outline color="medium" onClick={() => setAddingTime((v) => !v)}>{addingTime ? 'Cancelar' : '+ Añadir hora'}</IonChip>
                )}
              </div>
              {addingTime && (
                <>
                  <IonDatetime
                    presentation="time" hourCycle="h23" value={newTime}
                    onIonChange={(e) => setNewTime(String(e.detail.value).match(/(\d{2}):(\d{2})/)?.[0] ?? newTime)}
                  />
                  <IonButton expand="block" fill="outline" color="medium" onClick={addTime}>Añadir {newTime}</IonButton>
                </>
              )}
            </section>

            <p className="muted disclaimer">
              Esta app es solo un registro personal, no una herramienta médica. Si el estrés te desborda o dura mucho tiempo,
              consúltalo con un profesional de la salud.
            </p>
          </main>
        </IonContent>
      </IonPage>
    </IonApp>
  );
}

import { useEffect, useMemo, useState } from 'react';
import {
  IonApp, IonButton, IonButtons, IonContent, IonDatetime, IonHeader, IonIcon, IonInput, IonItem,
  IonLabel, IonList, IonPage, IonSegment, IonSegmentButton, IonTitle, IonToolbar,
  useIonAlert, useIonToast,
} from '@ionic/react';
import { chevronBack, chevronForward, close } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import Chart from './Chart';
import { exportEntries, type Format } from './exporter';
import { fmt, getPeriod, localISO, mean, type Range } from './period';
import { loadEntries, saveEntries } from './storage';
import { MOODS, type Entry } from './types';

const PAGE = 20;

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [range, setRange] = useState<Range>('day');
  const [offset, setOffset] = useState(0);
  const [shown, setShown] = useState(PAGE);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<string | null>(null);
  const [pickDate, setPickDate] = useState(false);
  const [toast] = useIonToast();
  const [alert] = useIonAlert();

  useEffect(() => { loadEntries().then(setEntries); }, []);

  const period = useMemo(() => getPeriod(entries, range, offset), [entries, range, offset]);
  const say = (message: string) => toast({ message, duration: 1500, position: 'bottom' });

  const commit = (next: Entry[]) => {
    setEntries(next);
    saveEntries(next).catch(() => say('No se pudo guardar'));
  };

  const add = (mood: number) => {
    const date = when ? new Date(when) : new Date();
    if (isNaN(date.getTime())) return say('Fecha inválida');
    const entry: Entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: date.toISOString(),
      mood,
      note: note.trim(),
    };
    commit([...entries, entry].sort((a, b) => a.ts.localeCompare(b.ts)));
    setNote('');
    setWhen(null);
    setPickDate(false);
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    say('Guardado');
  };

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
  const avg = period.items.length ? mean(period.items.map((e) => e.mood)).toFixed(1) : '–';

  return (
    <IonApp>
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle>Mood</IonTitle>
            <span slot="end" className="muted" style={{ paddingInlineEnd: 16 }}>
              {fmt({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
            </span>
          </IonToolbar>
        </IonHeader>

        <IonContent>
          <main className="page">
            <section>
              <p className="muted" style={{ margin: 0 }}>¿Cómo te sientes?</p>
              <div className="moods">
                {MOODS.map((m) => (
                  <IonButton key={m.v} fill="outline" color="medium" aria-label={m.t} onClick={() => add(m.v)}>
                    {m.e}
                  </IonButton>
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
              <div className="stats">
                <div><b>{avg}</b><span className="muted">promedio</span></div>
                <div><b>{period.items.length}</b><span className="muted">registros</span></div>
              </div>
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
                {recent.slice(0, shown).map((e) => {
                  const m = MOODS[e.mood - 1];
                  return (
                    <IonItem key={e.id}>
                      <span className="e">{m.e}</span>
                      <IonLabel className="note">
                        <small>{fmt({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(e.ts))}</small>
                        {e.note || m.t}
                      </IonLabel>
                      <IonButton slot="end" fill="clear" color="medium" aria-label="Eliminar" onClick={() => confirmRemove(e.id)}>
                        <IonIcon slot="icon-only" icon={close} />
                      </IonButton>
                    </IonItem>
                  );
                })}
              </IonList>
              {recent.length > shown && (
                <IonButton expand="block" fill="clear" color="medium" onClick={() => setShown(shown + PAGE)}>Mostrar más</IonButton>
              )}
            </section>
          </main>
        </IonContent>
      </IonPage>
    </IonApp>
  );
}

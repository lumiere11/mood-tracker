# Estrés

Medidor de estrés minimalista para Android, pensado para quien convive con estrés constante y quiere ver cómo evoluciona. Hecho con **Ionic (React) + Capacitor**. Sin cuentas ni servidores: los datos viven en el dispositivo.

- **Registro rápido:** nivel de estrés de 1 a 10 con un slider, más los **desencadenantes** (trabajo, familia, dinero, salud, sueño, social, tráfico, otro) y una nota opcional. Puedes cambiar la fecha y hora para registrar algo que olvidaste.
- **Gráficas diaria, semanal y mensual:** el día muestra cada registro en su hora; semana y mes muestran el **promedio** de cada día (barra) y el **pico** (punto), con navegación a periodos anteriores.
- **Resumen del periodo:** promedio, pico, número de registros y qué desencadenantes aparecen más y con qué intensidad media.
- **Exportar** el historial a CSV o JSON (en Android abre el menú de compartir: Drive, Archivos, correo… útil para llevarlo a una consulta).
- Modo claro/oscuro automático.

> Es un registro personal, no una herramienta médica. Si el estrés te desborda o dura mucho tiempo, consúltalo con un profesional de la salud.

## Obtener el APK

**Desde GitHub:** *Actions → Build APK → Run workflow*, y descarga `estres-debug-apk` de los artefactos. Instálalo en el móvil (hay que permitir "instalar apps desconocidas"). Al publicar un tag `v*` se crea además un release con el APK adjunto.

**En tu máquina** (necesitas Node 22, JDK 21 y Android Studio / Android SDK):

```bash
npm install
npm run android:sync      # compila la web y la copia al proyecto Android
npm run android:open      # abre Android Studio → Run ▶ o Build → Build APK
```

O por línea de comandos: `cd android && ./gradlew assembleDebug` → `android/app/build/outputs/apk/debug/app-debug.apk`.

## Desarrollo en el navegador

```bash
npm install
npm run dev
```

## Estructura

| Archivo | Qué hace |
| --- | --- |
| `src/App.tsx` | Pantalla única: registro, gráficas, desencadenantes e historial |
| `src/Chart.tsx` | Gráficas SVG (día: línea; semana/mes: barras de promedio + punto de pico) |
| `src/period.ts` | Cálculo de los periodos día/semana/mes |
| `src/types.ts` | Entrada, etiquetas, etiquetas de nivel y color |
| `src/exporter.ts` | Exportación CSV/JSON (compartir en Android, descarga en web) |
| `src/storage.ts` | Persistencia con `@capacitor/preferences` |

> Si desinstalas la app se pierde el historial: exporta de vez en cuando.

# Mood

Registro de ánimo minimalista para Android, hecho con **Ionic (React) + Capacitor**. Sin cuentas ni servidores: los datos viven en el dispositivo.

- Un toque para registrar cómo te sientes (1–5), con nota y fecha/hora opcionales.
- Gráficas **diaria**, **semanal** y **mensual**, con navegación a periodos anteriores.
- **Exportar** el historial a CSV o JSON (en Android abre el menú de compartir: Drive, Archivos, correo…).
- Modo claro/oscuro automático.

## Obtener el APK

**Desde GitHub:** *Actions → Build APK → Run workflow*, y descarga `mood-debug-apk` de los artefactos. Instálalo en el móvil (hay que permitir "instalar apps desconocidas").

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
| `src/App.tsx` | Pantalla única: registro, gráficas e historial |
| `src/Chart.tsx` | Gráficas SVG (día: línea, semana/mes: barras de promedio diario) |
| `src/period.ts` | Cálculo de los periodos día/semana/mes |
| `src/exporter.ts` | Exportación CSV/JSON (compartir en Android, descarga en web) |
| `src/storage.ts` | Persistencia con `@capacitor/preferences` |

> Si desinstalas la app se pierde el historial: exporta de vez en cuando.

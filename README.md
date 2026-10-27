# Mood

Registro de ánimo minimalista para Android (PWA). Sin cuentas ni servidores: los datos viven en tu dispositivo.

- Un toque para registrar cómo te sientes (1–5), con nota y fecha/hora opcionales.
- Gráficas **diaria**, **semanal** y **mensual**, con navegación a periodos anteriores.
- **Exportar** el historial completo a CSV o JSON.
- Funciona sin conexión y se instala en la pantalla de inicio.

## Instalar en Android

1. Publica la carpeta en cualquier hosting HTTPS (por ejemplo GitHub Pages: *Settings → Pages → Deploy from branch*).
2. Abre la URL en Chrome para Android → menú ⋮ → **Instalar app** / **Añadir a pantalla de inicio**.

Para probar en local: `python3 -m http.server 8000` y abre `http://localhost:8000`.

> Los datos se guardan en el navegador (`localStorage`). Si borras los datos del sitio se pierden: exporta el historial de vez en cuando.

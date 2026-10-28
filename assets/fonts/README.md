# Fuentes

La app usa **Clash Display** (Indian Type Foundry), en los pesos Medium y Semibold, para títulos y cifras grandes.

Los archivos `.ttf` no están en el repositorio: la licencia ITF Free Font permite usarlos dentro de la app, pero no repartirlos sueltos, y este repo es público.

Para compilar en un equipo nuevo:

1. Descarga Clash Display desde [fontshare.com](https://www.fontshare.com/fonts/clash-display).
2. Copia en esta carpeta los archivos con estos nombres exactos:
   - `ClashDisplay-Medium.ttf`
   - `ClashDisplay-Semibold.ttf`

El plugin `expo-font` de `app.json` los incrusta en la app, y en Android el nombre de la fuente es el del archivo (ver `src/presentation/theme/fonts.ts`).

EAS sube esta carpeta al compilar porque el proyecto tiene un `.easignore` que no la excluye.

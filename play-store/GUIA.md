# Publicar Rinde en Google Play

Todo lo que pide Google Play Console, en el orden en que lo vas a necesitar.

## 1. Lo que ya está listo en el proyecto

- Nombre de la app: **Rinde** (`app.json` → `expo.name`). Es lo que se ve debajo del ícono en el celular.
- Ícono, ícono adaptativo y splash propios, sin marca de cliente (`assets/`).
- Ícono para la tienda: `play-store/icono-512.png` (512×512).
- Gráfico de funciones: `play-store/grafico-funciones-1024x500.png` (1024×500).
- Permisos mínimos: sin micrófono, cámara ni almacenamiento (`android.blockedPermissions`).
- Android 16 / API 36 como `targetSdk` (lo trae Expo SDK 58), que es lo que Play exige a las apps nuevas desde agosto de 2026.
- `eas.json` con dos perfiles:
  - `preview`: APK para instalar a mano y probar.
  - `production`: AAB (`app-bundle`) para subir a Play, con número de versión automático.
- Política de privacidad: `docs/privacidad.html`.

## 2. Lo que falta y solo puedes hacer tú

- [ ] Poner tu correo de contacto en `docs/privacidad.html` (busca `[TU CORREO DE CONTACTO]`).
- [ ] Publicar la política en una URL pública. Lo más fácil es GitHub Pages: en el repo, *Settings → Pages → Deploy from a branch → main / docs*. Quedaría en
      `https://sergiocamilocastillo.github.io/rendimientos-rosas/privacidad.html`.
- [ ] Crear la cuenta de desarrollador en Google Play Console. Hazlo primero: la verificación tarda unos días.
  1. Entra a [play.google.com/console/signup](https://play.google.com/console/signup) con la cuenta de Google que quieras dejar como dueña de la app.
  2. Elige cuenta **personal** ("Para ti"). La de organización exige número D-U-N-S de una empresa registrada.
  3. Paga los US$25 (un solo pago, con tarjeta).
  4. Verifica tu identidad con la cédula, tu correo y tu teléfono.
  5. Instala la app *Google Play Console* en un celular Android e inicia sesión con esa cuenta: Google pide verificar que tienes un dispositivo Android.
- [ ] Crear una cuenta gratis en [expo.dev](https://expo.dev) para generar el build (sección 8).
- [ ] Conseguir 12 testers para la prueba cerrada (ver sección 7).

## 3. Ficha de la tienda

**Nombre** (máx. 30): `Rinde: Rendimientos de Finca`

El nombre en la tienda lleva las palabras que la gente busca; debajo del ícono solo sale "Rinde".

**Descripción breve** (máx. 80):

```
Registra el rendimiento de tu personal por turno y saca reportes en Excel.
```

**Descripción completa** (máx. 4000):

```
Rinde es la forma sencilla de llevar el rendimiento del personal de tu finca, sin planillas de papel.

Registra cada turno en segundos: quién trabajó, en qué actividad, en qué bloque, de qué hora a qué hora y cuánto rindió. La app calcula las horas, compara contra la meta y te muestra cómo va el día.

QUÉ PUEDES HACER
• Trabajadores: tu lista de personal con nombre, código y cargo.
• Actividades: cada labor con su unidad de medida y su meta por hora (tallos, camas, plantas…).
• Bloques: organiza el trabajo por bloque o lote.
• Registros diarios: uno o varios turnos por trabajador, y la app avisa si los horarios se cruzan.
• Resumen del día: cuántos cumplieron la meta, el porcentaje de cumplimiento y el total por labor.
• Historial: consulta y corrige los registros de días anteriores.
• Ausencias: personas y horas perdidas de cada día, con observaciones.
• Reporte semanal en Excel: resumen y detalle por trabajador, listo para compartir por WhatsApp o correo.
• Respaldo: guarda todos tus datos en un archivo y pásalos a otro celular cuando lo necesites.

FUNCIONA SIN INTERNET
Todo se guarda en tu celular. No necesitas señal en el campo ni crear una cuenta.

TUS DATOS SON TUYOS
La app no envía tu información a ningún servidor. Sin publicidad.

Pensada para fincas de flores y cultivos donde el trabajo se controla por rendimiento.
```

**Categoría**: Empresa (Business).
**Etiquetas sugeridas**: productividad, agricultura, gestión de personal.
**Correo de contacto**: el mismo que pongas en la política de privacidad.
**Política de privacidad**: la URL de GitHub Pages del paso 2.

## 4. Gráficos

| Recurso | Archivo | Tamaño |
|---|---|---|
| Ícono de la app | `play-store/icono-512.png` | 512×512 PNG |
| Gráfico de funciones | `play-store/grafico-funciones-1024x500.png` | 1024×500 PNG |
| Capturas de teléfono | `play-store/capturas/01…06-*.png` | 1080×1920 PNG (9:16) |

## 5. Capturas de pantalla

Ya están en `play-store/capturas/`, en el orden en que van en la ficha:

1. Inicio: el rendimiento del día.
2. Nuevo registro.
3. Historial: consulta y corrige días anteriores.
4. Ausencias: quién faltó y cuántas horas se perdieron.
5. Reporte semanal en Excel.
6. Respaldo: los datos se quedan en el celular.

Estadísticas, Metas semanales y los reportes avanzados están ocultos en esta versión (`PREMIUM_ENABLED = false` en `src/config/features.ts`), así que no salen en las capturas ni en la descripción. Si se activan, hay que volver a incluirlos aquí.

Se tomaron en el emulador con datos inventados (nombres ficticios, ninguno de Innovaflora), con la barra de estado limpia, y llevan un titular arriba con el estilo de la marca. Súbelas todas en *Ficha de Play Store principal → Capturas de pantalla del teléfono*.

## 6. Formularios de Play Console

**Seguridad de los datos**
- ¿La app recopila o comparte alguno de los tipos de datos del usuario requeridos? → **No**.
  (Los datos se guardan solo en el dispositivo y no se envían a ningún servidor; Google no los cuenta como "recopilados").
- ¿Los datos se encriptan en tránsito? → No aplica, no hay transmisión.
- ¿Los usuarios pueden pedir que se borren sus datos? → Se borran desde la app o al desinstalarla.

**Clasificación del contenido (IARC)**: categoría "Utilidad, productividad, comunicación u otro". Responde **No** a todo: violencia, contenido sexual, lenguaje, drogas, apuestas, interacción entre usuarios, compras. Debería salir "Apto para todo público".

**Público objetivo**: solo **18 años o más**. Así no entras en las reglas de apps para niños.

**Anuncios**: la app **no** contiene anuncios.

**Acceso a la app**: toda la funcionalidad está disponible sin restricciones (no hay inicio de sesión).

**App de noticias / de salud / de gobierno / financiera**: No.

## 7. Prueba cerrada (obligatoria en cuentas personales nuevas)

Google exige que una cuenta personal nueva haga una prueba cerrada con **al menos 12 testers durante 14 días seguidos** antes de pedir acceso a producción.

1. En Play Console: *Pruebas → Prueba cerrada → Crear canal*.
2. Agrega los correos de Gmail de los testers. Los supervisores de Innovaflora y personas cercanas sirven.
3. Sube el AAB (sección 8) y comparte el enlace de participación.
4. Cada tester debe aceptar el enlace e instalar la app desde Play. Deben seguir inscritos los 14 días.
5. Al terminar, pide acceso a producción desde el Panel; Google pregunta cómo fue la prueba.

## 8. Generar el build con EAS

Una sola vez:

```bash
npm install -g eas-cli
```

```bash
eas login
```

```bash
eas init
```

`eas init` crea el proyecto en tu cuenta de Expo y agrega su `projectId` a `app.json`.

APK para probar en tu celular:

```bash
eas build -p android --profile preview
```

AAB para Play Store:

```bash
eas build -p android --profile production
```

La primera vez, EAS pregunta si genera un keystore nuevo: di que **sí**. EAS lo guarda en tu cuenta. Descarga una copia de respaldo con `eas credentials` y guárdala fuera del repo; si la pierdes, no podrás actualizar la app.

**La primera subida a Play es manual**: descarga el `.aab` desde la página del build y súbelo en Play Console. Deja activada *Firma de apps de Google Play*. Después de esa primera vez puedes usar `eas submit -p android`, que necesita una cuenta de servicio de Google Cloud.

## 9. Ojo con los celulares que ya tienen la app

Los APK que instalaste antes en Innovaflora están firmados con la clave de depuración. Android no deja actualizar una app firmada con una clave distinta, así que para pasarlos a la versión de Play **hay que desinstalar la app vieja, y eso borra todos sus datos**.

Para no perderlos, en cada celular:

1. Abre la app vieja y ve a *Menú → Respaldo → Crear respaldo*. Guarda el archivo en Drive o mándatelo por WhatsApp.
2. Desinstala la app vieja.
3. Instala Rinde desde Play.
4. En *Menú → Respaldo → Restaurar respaldo → Elegir archivo*, elige el archivo del paso 1.

Hazlo en un corte de semana, después de sacar los reportes.

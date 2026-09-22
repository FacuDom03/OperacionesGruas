# Estado del proyecto

Última actualización: 22/09/2026

Este archivo dice qué está hecho y qué sigue. Actualizalo cuando termines una fase.

## Contexto

La Central Operativa reemplaza dos Excel de operaciones del Grupo Daniele. El
alcance completo, el modelo de datos y el plan por fases están en `docs/spec.md`.
Las reglas del proyecto, en `CLAUDE.md`. Leé los dos antes de tocar código.

## Hecho

### Fase 0 — preparación (parcial)

- Andamiaje de despliegue: `Dockerfile` (Next.js standalone + Chromium para los
  PDF), `.dockerignore`, `.env.example`, `docker-compose.dev.yml` (Postgres local
  en el puerto 5433) y `DEPLOY.md` con los pasos de EasyPanel.
- **Estos archivos ya están probados. No los reescribas: adaptá el proyecto a ellos.**

### Fase 1 — primera mitad

- `src/db/schema.ts` — el esquema completo, 15 tablas, con los enums, las claves
  foráneas, los índices, la restricción única `(fecha, equipo_id, orden_dia)` y el
  CHECK de `orden_dia BETWEEN 1 AND 4`.
- `drizzle/0000_esquema_inicial.sql` — la migración ya generada y aplicada con
  éxito contra PostgreSQL 16.
- `scripts/importar-excel.ts` — la importación de maestros desde los dos Excel.
  Idempotente, probada corriéndola dos veces seguidas.
- `docs/informe-importacion.md` — las 43 cosas que encontró al leer los archivos.

**Esto ya se ejecutó de verdad. Los números que tiene que dar:**

| Tabla | Filas |
|---|---|
| `empresas` | 10 |
| `lugares` | 7 |
| `personal` | 55 |
| `equipos` | 96 |

Si te da otra cosa, algo se rompió: no ajustes el script para que los números
cierren, averiguá por qué cambió.

### Fase 1 — segunda mitad

- Proyecto Next.js 15 (App Router, TypeScript, Tailwind) con `output: 'standalone'`.
- `GET /api/health`, que es lo que consulta el `HEALTHCHECK` del Dockerfile.
- `src/instrumentation.ts` aplica las migraciones al arrancar. Probado contra una
  base vacía: crea las 15 tablas y en el segundo arranque no reaplica nada.
- Auth.js con los cuatro roles. Las contraseñas van con `scrypt` de Node, para no
  sumar una dependencia nativa a la imagen. El primer admin se crea con
  `npm run usuario`.
- ABM de personal, equipos, empresas, clientes y lugares, con auditoría de cada
  escritura, teléfono normalizado a la Cloud API e interno a `GDU` + 3 dígitos.
- Alta, edición y listado de salidas, con la numeración por secuencia de Postgres
  (migración `0001`), los avisos de solapamiento y la regla de que una salida
  finalizada solo la reabre un admin.
- PDF de la salida individual (`/print/salida/[id]`, una página A4) y parte del
  día (`/print/dia/[fecha]`, portada más una hoja por salida), con Puppeteer.
  Se guardan en `PDF_STORAGE_PATH` con el número de salida como nombre.

### Fase 3 — vehículos livianos

- Grilla del día editable en línea (`/livianos`), una fila por unidad liviana.
  Cada fila se guarda sola, así un error en una no pierde lo cargado en el resto.
- Alerta cuando una unidad lleva más de 12 h sin hora de regreso, arriba y en la
  propia fila.
- PDF del día y del mes, los dos en horizontal porque la grilla tiene diez
  columnas. El del mes lleva una página por día más los totales por unidad.
- Reemplaza el GD 208.

### Fase 4 — checklists (lado de la app)

- `POST /api/checklists` autenticado por `x-api-key`, listo para que n8n lo
  llame. Resuelve la unidad por interno y la persona por teléfono, guarda ítems
  y adjuntos, y deja el JSON crudo en `checklists.payload`. Idempotente por
  (fecha, equipo).
- Pantalla `/checklists` con contadores, lista del día y detalle, y el marcado
  como revisado para mantenimiento y admin.
- **n8n todavía no está conectado**: el flujo lo arma la empresa.

### Guardias

- `/guardias` para cargar quién está de guardia cada día, por puesto (chofer
  grúa, chofer camión, ayudante). Puede haber más de una persona por puesto.
- La tarjeta «Guardia de hoy» del tablero, que completa el mockup.
- No tiene pestaña propia porque la barra del mockup es fija: se entra desde la
  tarjeta del tablero o desde Maestros.

### Diseño y calendario

- Las pantallas siguen el mockup del canvas: Barlow Condensed en títulos, IBM
  Plex Sans en texto, IBM Plex Mono en los datos, y la paleta con los valores
  exactos. El sistema vive en `src/app/globals.css` y `src/components/ui.tsx`.
- Selector de empresa en la barra: filtra las salidas (y el PDF del parte del
  día). Los equipos y el personal no se filtran porque las unidades son de uso
  compartido del grupo.
- Fase 5 — calendario de trabajos (`/calendario`) con vistas mes, semana y día,
  color por tipo de unidad y borde punteado para las salidas a confirmar.

### Fase 6 — cierre

- `/auditoria`, solo para admin: el registro de cambios que ya se escribía pero
  no se podía ver. Filtros por entidad, acción, usuario y rango de fechas (que
  aplican solos, sin botón), paginado de a 50, y el detalle campo por campo con
  el antes y el después. Los identificadores se muestran como número a propósito:
  es lo que tenía la fila en ese momento, el nombre pudo cambiar después.
- Guardar sin cambiar nada ya no deja línea: antes cada «Guardar» escribía una
  edición vacía y tapaba las que importan.
- `/maestros` ahora linkea guardias, usuarios y el registro. Antes contaba las
  guardias y los usuarios pero no los mostraba.
- `scripts/respaldo.sh` (`npm run respaldo`): volcado de la base con rotación por
  días. Comprueba que el archivo se pueda leer **antes** de borrar los viejos,
  así nunca se queda sin ninguno bueno. Corre en el VPS, con el `pg_dump` del
  contenedor de Postgres: el del host suele ser de otra versión.
  Probado de punta a punta, restaurando en una base aparte: dio 10 empresas,
  7 lugares, 55 personas y 96 equipos.
- `docs/manual.md`: el manual corto para quien va a cargar las salidas.
- Un checklist reenviado **con otro contenido** pierde la marca de revisado: lo
  que mantenimiento reviso ya no es lo que hay. Un reenvio identico no la toca.
  La comparacion es con las claves ordenadas porque `jsonb` no conserva el orden
  en que vinieron.
- `scripts/probar-auditoria.mjs`, y `/auditoria` y `/maestros/usuarios` sumados
  al barrido de `probar-todo.mjs`.

### Herramientas (pedido del 21/09)

Capítulo 14 del spec, que se escribió para esto. **No cuelga de la salida**: lo
que se guarda es la custodia —quién o qué tiene la herramienta ahora— y la
salida es uno de los momentos en que esa custodia cambia. Colgarla de la salida
dejaba la herramienta sin ubicación al día siguiente, y no cubría las que viven
arriba de una unidad ni las que están en el taller.

- Tres tablas: `herramientas` con la custodia actual cacheada, `herramienta_entregas`
  (el acta, que puede llevar varias herramientas y es lo que se confirma de una
  sola vez) y `herramienta_movimientos`, una línea por herramienta con de dónde
  venía. Migración `0002`.
- El historial y la custodia cacheada se escriben en la misma transacción. Si
  discrepan, el listado miente, y el listado es todo el punto.
- `/herramientas`: listado con dónde está cada una y desde cuándo, filtros,
  tarjetas de las que están afuera, sin confirmar y sin devolver hace más de 30
  días. La ficha tiene el historial completo.
- `/herramientas/entregar`: el acta. Avisa si lo que entregás lo tiene otro,
  pero no bloquea, igual que el solapamiento de personal.
- `/confirmar/[token]`: el formulario del empleado, público y pensado para el
  teléfono. La credencial es el token del link; en la base queda solo el hash.
  Vale hasta que se confirma o hasta los 30 días.
- En la salida: bloque «Herramientas de esta salida», que entrega con la
  cuadrilla propuesta, y las herramientas salen en la hoja que firma el chofer.
- La tarjeta del tablero.

**n8n todavía no manda el link**: hoy se copia y se manda a mano. Cuando se
conecte, es un POST más al webhook; nada de esto cambia.

### La pantalla de sin permiso

`permisoRequerido` tiraba un `Error` con el motivo. En el build de producción
React borra el mensaje de los errores del servidor, así que el usuario veía un
párrafo sobre *digests*. Ahora manda a `/sin-permiso`, que dice qué rol tiene y
cuál hace falta. Aplica a toda la app, no solo a herramientas.

### Los PDF (22/09)

Salían con una tipografía que no era la del mockup y sin los acentos. Tres
causas, todas distintas:

1. **Las tipografías venían de Google.** El `<link>` a `fonts.googleapis.com`
   estaba en el layout raíz, así que el PDF dependía de que el contenedor
   pudiera salir a internet **en el momento de generarlo**. Si no podía, la
   hoja salía con la que el navegador tuviera a mano, y encima
   `waitUntil: 'networkidle0'` se quedaba esperando un pedido que no
   contestaba. Ahora las sirve la app desde `public/fuentes`, bajadas con
   `node scripts/bajar-fuentes.mjs` (172 kB, solo el subconjunto latin).
2. **El middleware se comía los `.woff2`.** El `matcher` solo dejaba afuera
   `_next/static`, el favicon, `.png` y `.svg`, así que el pedido de la
   tipografía se iba a `/ingresar` con un 307. Ahora quedan afuera `/fuentes`
   y las extensiones de archivos estáticos.
3. **Las hojas no usaban el sistema de diseño.** Estaban con `font-bold` y
   `uppercase` sueltos en vez de `.hdg` y `.mono`, así que aunque las
   tipografías cargaran, el PDF no se parecía a la pantalla. Y los textos
   estaban escritos sin tilde: «Telefono», «Gestion», «En ejecucion»,
   «Parte del dia», «Vehiculos livianos».

`scripts/probar-pdf.mjs` ahora comprueba que el `.woff2` responda 200 sin
redirección, que la hoja cargue las tres familias y que los textos lleven
tilde. Las tres cosas fallaban antes y ninguna se veía en el HTML.

**Visto una vez, sin poder reproducir:** un error de hidratación de React
(#418) en `/maestros/equipos` durante un barrido. No volvió a aparecer en 6
intentos ni en los barridos siguientes. Queda anotado.

## Lo que falta

### El orden cambió: WhatsApp va último

La fase 2 del spec (WhatsApp) pasa al final, por decisión del 16/09. El flujo de
n8n lo configura la empresa; de la app salen el POST al webhook y el endpoint de
estados. El orden queda: **6 (cierre) → 2 (WhatsApp)**. La 4 (checklists, lado app), la
5 (calendario) y la 6 ya están hechas. No lo "corrijas" al orden del capítulo 12 del spec.

### Pendientes que dejó la fase 1

- **El aviso de solapamiento usa un margen de 2 horas** porque el modelo no tiene
  hora de regreso: el Excel nunca la tuvo. Si se agrega, el aviso pasa a ser por
  cruce real de horarios. Está marcado en `src/lib/salidas.ts`.
- **La numeración puede dejar huecos.** La secuencia de Postgres es lo que evita
  números repetidos con dos altas a la vez, pero un alta que falla igual consume
  su número. Si la numeración tiene que ser corrida, hay que resolverlo aparte.
- **`src/db/index.ts` abre la conexión recién cuando se usa.** Antes tiraba el
  error al importarse, y eso rompía `next build` dentro del Dockerfile, donde no
  hay `.env`. No hace falta pasarle una `DATABASE_URL` al build.
- ~~`docs/fuentes/` está en `.dockerignore`~~ **Resuelto el 17/09.** El build
  compila el importador a `dist/importar-excel.js` con esbuild, y la imagen se
  lleva ese archivo más los dos Excel. En el servidor, la importación se corre
  una vez desde la consola del servicio:

  ```bash
  node scripts/importar-excel.js
  ```
- **TypeScript quedó en 5.9 y no en la 7.0.2** de `dependencias.json`: la 7 no
  expone `ts.sys` ni `transpileModule`, y Next no puede leer `next.config.ts` ni
  chequear tipos. No afecta a la importación, que corre con `tsx`.
- **El cliente de la salida es de texto libre con sugerencias.** Lo que se
  escribe y no está en el maestro se da de alta al guardar, comparando sin
  distinguir mayúsculas ni espacios de más. Si algún día hace falta un cliente
  de una sola vez que no ensucie el maestro, habría que agregar una columna de
  texto en `salidas`.
- El token de las rutas `/print` se marca como usado **en memoria**. Con una sola
  instancia alcanza; si algún día corren varias, tiene que pasar a la base.
- **`uso_livianos` no tiene un único por (fecha, unidad)**, así que una unidad
  puede tener más de un movimiento en el día. La grilla lo soporta; si operaciones
  prefiere una sola fila por día, hay que agregar la restricción.

### Pendientes que dejó la fase 6

- **Los respaldos hay que dejarlos corriendo en el VPS.** El script está y se
  probó, pero la línea de cron la pone quien tiene el SSH. Está en DEPLOY.md.
- **El registro de cambios no se purga.** La tabla `auditoria` crece para
  siempre. Con el volumen de la empresa no es problema por años, pero si algún
  día molesta, se archiva por fecha, no se borra.
- **Gestión de herramientas: hecha, salvo el envío.** Falta que n8n mande el
  link de confirmación; hasta entonces se copia y se manda a mano. Ver más
  arriba.

### Pendientes que dejó la gestión de herramientas

- **Falta el listado de herramientas de la empresa** para cargar el inventario.
  Sin eso el panel está vacío.
- **Los códigos son `GDH` + tres dígitos**, mismo criterio que los internos.
  Está por definir si los pone la empresa o los genera el sistema.
- **El token de confirmación no se puede reemitir.** Si se pierde el link, hay
  que registrar la entrega de nuevo. Se resuelve con un botón de «reenviar»
  cuando esté n8n, que es cuando de verdad va a hacer falta.
- **La entrega no se puede anular.** Si se cargó mal, se arregla con otro
  movimiento, que queda en el historial. Es a propósito, pero si molesta hay que
  decidir qué hacer.
- **Las alertas no avisan solas**: se ven en el tablero y en el panel, pero
  nadie recibe nada. Eso también espera a n8n.

## Decisiones ya tomadas (no las revisites sin preguntar)

- App web propia sobre PostgreSQL. No Odoo, no herramientas no-code.
- La app **no llama a la API de Meta**: le pega a un webhook de n8n.
- Los PDF se generan con Puppeteer sobre rutas `/print/...` de la misma app.
- Despliegue en EasyPanel sobre un VPS de Hostinger (KVM 2: 2 vCPU, 8 GB, 100 GB),
  build por **Dockerfile**, nunca Nixpacks — Nixpacks no instala Chromium.
- La app usa su propia base `central_operativa`. **Nunca toca la de n8n.**

## Bloqueantes que dependen de la empresa

1. **Faltan los teléfonos del personal.** Sin eso no funciona el envío por WhatsApp.
2. **Falta la plantilla aprobada por Meta** para iniciar conversación.
3. **Falta definir si el cliente y la OT salen de Odoo** o si la central mantiene
   su propio maestro de clientes.

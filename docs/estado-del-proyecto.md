# Estado del proyecto

Última actualización: 16/09/2026

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

### Diseño y calendario

- Las pantallas siguen el mockup del canvas: Barlow Condensed en títulos, IBM
  Plex Sans en texto, IBM Plex Mono en los datos, y la paleta con los valores
  exactos. El sistema vive en `src/app/globals.css` y `src/components/ui.tsx`.
- Selector de empresa en la barra: filtra las salidas (y el PDF del parte del
  día). Los equipos y el personal no se filtran porque las unidades son de uso
  compartido del grupo.
- Fase 5 — calendario de trabajos (`/calendario`) con vistas mes, semana y día,
  color por tipo de unidad y borde punteado para las salidas a confirmar.

## Lo que falta

### El orden cambió: WhatsApp va último

La fase 2 del spec (WhatsApp) pasa al final, por decisión del 16/09. El flujo de
n8n lo configura la empresa; de la app salen el POST al webhook y el endpoint de
estados. El orden queda: **4 (checklists) → 6 (cierre) → 2 (WhatsApp)**. La 5
(calendario) ya está hecha. No lo "corrijas" al orden del capítulo 12 del spec.

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
- Del tablero del mockup faltan tres bloques que dependen de datos que todavía
  no existen: «Checklists pendientes», los contadores de checklists y «Guardia
  de hoy». Entran con la fase 4 y con la carga de guardias.
- El token de las rutas `/print` se marca como usado **en memoria**. Con una sola
  instancia alcanza; si algún día corren varias, tiene que pasar a la base.
- **`uso_livianos` no tiene un único por (fecha, unidad)**, así que una unidad
  puede tener más de un movimiento en el día. La grilla lo soporta; si operaciones
  prefiere una sola fila por día, hay que agregar la restricción.

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

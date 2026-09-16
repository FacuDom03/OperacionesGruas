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

## Lo que falta

### Fase 1 — segunda mitad
- Proyecto Next.js 15 (App Router, TypeScript, Tailwind, shadcn/ui) alrededor de
  lo que ya está. `next.config.ts` necesita `output: 'standalone'`.
- Ruta `GET /api/health` que devuelva 200 — el `HEALTHCHECK` del Dockerfile la usa.
- `src/instrumentation.ts` que aplique las migraciones al arrancar.
- Auth.js con los cuatro roles y el primer usuario `admin`.
- ABM de maestros.
- Alta, edición y listado de salidas de trabajo, con los avisos de solapamiento.
- PDF de la salida individual y parte del día, con Puppeteer sobre `/print/...`.

### Fases 2 a 6
Ver el capítulo 12 de `docs/spec.md`.

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

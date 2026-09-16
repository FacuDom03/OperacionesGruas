# Central Operativa — Gruas Daniele

Reglas de este repositorio. Leelas antes de escribir código.

## Qué es esto

Aplicación web que reemplaza dos Excel de operaciones del Grupo Daniele:

- **GD 200 — Salida Operaciones**: las salidas de trabajo del día, una por unidad y hasta 4 trabajos por unidad.
- **GD 208 — Control de Vehículos Livianos**: quién usó cada vehículo liviano y en qué horario.

Además centraliza el resumen de los checklists que ya llegan por WhatsApp vía n8n, y un calendario alimentado por las salidas.

**Antes de empezar cualquier tarea, leé `docs/spec.md` completo.** Ahí está el alcance, el modelo de datos, el mapeo campo por campo desde los Excel y el plan por fases. Los archivos fuente originales están en `docs/fuentes/`.

## Stack

| Capa | Elección |
|---|---|
| App | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind + shadcn/ui |
| Base de datos | PostgreSQL |
| ORM | Drizzle ORM |
| Auth | Auth.js (credentials) con roles |
| PDF | Puppeteer renderizando rutas `/print/...` de la misma app |
| WhatsApp | n8n como intermediario hacia Meta Cloud API |
| Deploy | EasyPanel en VPS de Hostinger, build por Dockerfile |

No cambies ninguna de estas elecciones sin preguntar.

## Reglas del proyecto

### Base de datos

- El esquema vive en `src/db/schema.ts` y es la única fuente de verdad. Debe coincidir con el capítulo 4 de `docs/spec.md`.
- Migraciones con `drizzle-kit generate`. Los SQL quedan versionados en `drizzle/`.
- Las migraciones se aplican solas al arrancar el servidor, desde `src/instrumentation.ts`. Nunca a mano en producción.
- **Nunca toques la base de datos de n8n.** La app usa su propia base (`central_operativa`) aunque comparta el servidor de Postgres.
- Toda escritura que modifique una salida, un uso de liviano o un maestro deja registro en `auditoria`.

### Idioma y formatos

- Toda la interfaz en **español rioplatense**. Los nombres de tablas, columnas y tipos también van en español (ya están definidos así en el spec).
- Fechas en pantalla y en PDF: `dd/mm/aaaa`. Horas: `HH:mm` de 24 h.
- Zona horaria fija: `America/Argentina/Buenos_Aires`. Guardá `timestamptz` en la base y formateá en la vista.
- Los internos de equipo se escriben siempre `GDU` + tres dígitos, en mayúscula, sin espacios.
- Los teléfonos se guardan normalizados a E.164 sin el `+`: `54` + `9` + área + número (ejemplo: `5491155782210`). **El `9` va siempre**: es lo que marca que es un celular argentino, y sin él el mensaje no llega.

### PDFs

- Un PDF es siempre una ruta `/print/...` de la app renderizada con Puppeteer. No se mantiene un maquetado aparte.
- Las rutas `/print/...` requieren sesión válida o un token de un solo uso; nunca quedan públicas.
- Los PDF generados se guardan en `PDF_STORAGE_PATH` con el número de salida como nombre (`SAL-2026-0873.pdf`) para poder adjuntarlos al WhatsApp sin regenerarlos.
- Chromium ya viene instalado en la imagen Docker, en `/usr/bin/chromium`. Usá `PUPPETEER_EXECUTABLE_PATH` y lanzá con `--no-sandbox --disable-dev-shm-usage`.

### WhatsApp

- **La app nunca llama directo a la API de Meta.** Hace un POST al webhook de n8n definido en `N8N_WHATSAPP_WEBHOOK_URL`, autenticado con `N8N_WEBHOOK_TOKEN`.
- Cada envío deja una fila en `salida_envios`, una por destinatario, con su `wamid` y su estado.
- n8n devuelve los cambios de estado a `/api/envios/[wamid]`, protegido con el mismo token.
- Antes de enviar hay que validar que todos los destinatarios tengan teléfono cargado. Si falta alguno, se avisa en pantalla y se envía igual al resto.

### Validaciones de negocio

- `UNIQUE (fecha, equipo_id, orden_dia)`: una unidad no puede tener dos veces el mismo número de trabajo en el día.
- Si una persona ya está asignada ese día en un horario que se pisa, se muestra **advertencia, no bloqueo**. Lo mismo para la unidad.
- Una salida `finalizado` no se edita. Solo un usuario `admin` la reabre, y queda en auditoría.
- La numeración `SAL-<año>-<secuencia>` la genera una secuencia de Postgres. El usuario nunca la escribe.

### Seguridad

- Ningún secreto en el código ni en el repositorio. Todo por variables de entorno, declaradas en `.env.example`.
- Los endpoints que consume n8n (`/api/checklists`, `/api/envios/...`) se autentican por header `x-api-key`.
- Cuatro roles: `admin`, `operaciones`, `mantenimiento`, `consulta`. Verificá el rol en el servidor, nunca solo en la interfaz.

### Cómo trabajar

- Andá fase por fase según el capítulo 12 del spec. No empieces una fase sin terminar la anterior.
- Antes de escribir pantallas, el esquema y el script de migración de los Excel tienen que estar andando.
- El script de migración de los Excel (`scripts/importar-excel.ts`) tiene que ser **idempotente**: correrlo dos veces no puede duplicar nada. Usá el `interno` del equipo, el documento de la persona y el CUIT de la empresa como claves naturales.
- Aplicá las correcciones de inconsistencias del capítulo 5 del spec durante la importación (GDU061 y GDU064 duplicados, interno `111` sin prefijo, legajo GDL012 repetido, nombres de empresa distintos entre los dos libros, equipos sin tipo).
- Commits en español, en imperativo y cortos: `agrega alta de salida de trabajo`.
- No agregues dependencias grandes sin preguntar.

## Comandos

```bash
npm run dev            # desarrollo en http://localhost:3000
npm run db:generate    # genera la migración a partir del schema
npm run db:push        # aplica el schema en desarrollo
npm run db:studio      # explorador visual de la base
npm run import:excel   # carga los maestros desde docs/fuentes/
npm run usuario        # da de alta un usuario: -- --email x@y.com --rol admin
npm test               # comprueba las normalizaciones de telefono, interno y CUIT
npm run build          # build de producción
npm run lint
```

## Desarrollo local

```bash
cp .env.example .env
docker compose -f docker-compose.dev.yml up -d   # Postgres local en el 5433
npm install
npm run db:push
npm run import:excel
npm run dev
```

El Postgres de desarrollo escucha en el **5433** para no chocar con ninguno que ya tengas en el 5432. Nunca apuntes el entorno de desarrollo al Postgres del VPS.

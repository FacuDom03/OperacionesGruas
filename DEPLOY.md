# Deploy en EasyPanel (VPS de Hostinger)

Cómo queda montado y cómo publicar los cambios. Se configura una vez.

---

## Cómo queda el servidor

```
VPS Hostinger
└── EasyPanel
    ├── n8n                    (ya está)
    ├── postgres               (ya está — le agregamos una base nueva)
    └── central-operativa      (la app, servicio nuevo)
         ├── dominio: central.tudominio.com
         ├── volumen para los PDF
         └── deploy automático desde GitHub
```

La app **no comparte base con n8n**: usa una base propia llamada `central_operativa` dentro del mismo servidor de Postgres. Así no hay riesgo de tocar los datos de n8n y los backups se pueden separar.

---

## Antes de empezar: revisá la memoria del VPS

Chromium levanta un navegador entero cada vez que se genera un PDF. Sumado a n8n y Postgres:

- **4 GB o más:** andás tranquilo.
- **2 GB:** funciona, pero agregá 2 GB de swap antes de arrancar y no generes el parte del día completo en horario pico.
- **1 GB:** no alcanza. Conviene subir de plan.

Para ver cuánta tiene, por SSH: `free -h`

---

## Paso 1 — Crear la base de datos

En EasyPanel, entrá al servicio de Postgres que ya tenés. Hay una consola o terminal desde el panel. Corré:

```sql
CREATE DATABASE central_operativa;
CREATE USER central WITH ENCRYPTED PASSWORD 'poné-una-clave-larga-acá';
GRANT ALL PRIVILEGES ON DATABASE central_operativa TO central;
\c central_operativa
GRANT ALL ON SCHEMA public TO central;
```

Anotá la clave, la vas a necesitar en el paso 3.

El **nombre interno** del servicio de Postgres lo ves en la página del servicio: tiene la forma `nombreDelProyecto_postgres`. Ese es el host que usa la app, no `localhost` ni la IP pública.

---

## Paso 2 — Crear el servicio de la app

En EasyPanel: **Crear servicio → App**. Nombre: `central-operativa`.

En la configuración de origen y build:

| Campo | Valor |
|---|---|
| Origen | GitHub → tu repositorio |
| Rama | `main` |
| Método de build | **Dockerfile** |
| Ruta del Dockerfile | `Dockerfile` |

**Importante: el método tiene que ser Dockerfile, no Nixpacks.** Nixpacks no instala Chromium y los PDF no van a salir.

Si es la primera vez que conectás GitHub, EasyPanel te va a pedir instalar su aplicación de GitHub en tu cuenta. Aceptá y dale acceso a este repositorio.

---

## Paso 3 — Variables de entorno

En la pestaña de variables de entorno del servicio, pegá esto con tus valores reales:

```
DATABASE_URL=postgresql://central:LA_CLAVE@nombreDelProyecto_postgres:5432/central_operativa
AUTH_SECRET=<generá uno con: openssl rand -base64 32>
AUTH_URL=https://central.tudominio.com
AUTH_TRUST_HOST=true
N8N_WHATSAPP_WEBHOOK_URL=https://n8n.tudominio.com/webhook/salida-whatsapp
N8N_WEBHOOK_TOKEN=<inventá uno largo>
CHECKLIST_API_KEY=<inventá otro largo>
WHATSAPP_TEMPLATE=salida_trabajo_v1
PDF_STORAGE_PATH=/app/storage/pdf
TZ=America/Argentina/Buenos_Aires
NODE_ENV=production
```

Los dos tokens que inventás acá los tenés que poner también en las credenciales de n8n: son la contraseña compartida entre los dos sistemas.

---

## Paso 4 — Dominio

En la pestaña de dominios del servicio:

- Dominio: `central.tudominio.com`
- Puerto interno: `3000`
- HTTPS activado

EasyPanel saca el certificado de Let's Encrypt solo. Antes de guardar, asegurate de tener el registro DNS `A` de `central.tudominio.com` apuntando a la IP del VPS, si no el certificado falla.

---

## Paso 5 — Volumen para los PDF

En la pestaña de montajes:

| Tipo | Nombre | Ruta dentro del contenedor |
|---|---|---|
| Volumen | `pdf-storage` | `/app/storage` |

Sin esto, los PDF generados se borran en cada deploy.

---

## Paso 6 — Deploy automático al hacer push

EasyPanel te da una **URL de webhook de deploy** en la pestaña de deploys del servicio. Copiala.

En GitHub: **Settings → Webhooks → Add webhook**

| Campo | Valor |
|---|---|
| Payload URL | la URL que te dio EasyPanel |
| Content type | `application/json` |
| Eventos | solo `push` |

Listo. Desde ahora, cada `git push` a `main` dispara el build y el reinicio solos.

> Si conectaste GitHub con la aplicación oficial en el paso 2, es posible que EasyPanel ya tenga un interruptor de "deploy automático" y no haga falta el webhook a mano. Fijate primero si está.

---

## Paso 7 — Primer deploy y carga de maestros

1. Apretá **Deploy**. El primer build tarda varios minutos: descarga Chromium.
2. Mirá los logs. Tiene que decir que aplicó las migraciones y que el servidor está escuchando en el 3000.
3. Entrá a `https://central.tudominio.com`.
4. Para cargar los maestros desde los Excel, abrí la consola del servicio y corré:

   ```bash
   node scripts/importar-excel.js
   ```

   Los Excel tienen que estar en el repositorio, en `docs/fuentes/`.

---

## Día a día

```bash
git add .
git commit -m "agrega calendario semanal"
git push
```

Y en un par de minutos está publicado. Si algo sale mal, EasyPanel guarda los deploys anteriores y podés volver al último que funcionaba desde la pestaña de deploys.

---

## Backups

El Postgres del VPS es ahora el único lugar donde viven las salidas de trabajo. Configurá un backup automático **antes** de que la empresa empiece a usarlo en serio:

- EasyPanel tiene backups programados por servicio, a un destino S3 compatible.
- Como mínimo: un backup diario de la base, guardado fuera del VPS.
- Probá una restauración una vez, antes de apagar el Excel. Un backup que nunca se restauró no es un backup.

---

## Si algo falla

| Síntoma | Causa más común |
|---|---|
| El build termina pero la app no levanta | Falta `output: 'standalone'` en `next.config.ts` |
| Los PDF salen en blanco o tiran error | Puppeteer sin `--no-sandbox --disable-dev-shm-usage` |
| Los PDF muestran cuadraditos en vez de letras | Falta una tipografía en la imagen: agregala al `apt-get install` del Dockerfile |
| No conecta a la base | Estás usando `localhost` en vez del nombre interno del servicio de Postgres |
| El certificado no se emite | El DNS todavía no apunta al VPS, o no propagó |
| El contenedor se reinicia solo | Se quedó sin memoria generando un PDF. Revisá con `free -h` y agregá swap |

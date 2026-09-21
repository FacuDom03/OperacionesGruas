# Central Operativa — Gruas Daniele
### Especificación funcional y técnica + plan de trabajo

**Versión** 1.0 · 13/09/2026
**Fuentes relevadas:** `GD 200 - Salida Operaciones 20260913.xlsx` · `GD 208 - Control de Vehiculos Livianos 2026-9.xlsx`
**Mockup de pantallas:** canvas "Central Operativa Gruas Daniele"

---

## 1. Qué problema resuelve

Hoy operaciones trabaja con dos Excel:

- **GD 200** — una hoja `Operacion` con un bloque por unidad (38 unidades) y hasta 4 trabajos por unidad en el día, más una hoja de impresión por cada unidad (`100-Kia`, `505-Liebherr 1250`, etc.), maestros (`Personal`, `Equipos`, `Empresas`, `Verificador`, `Operador`), guardias y tres hojas de transporte tercerizado (`Resumen Montera`, `Resumen Rivas`, `Resumen FMB`).
- **GD 208** — un libro por mes con una hoja por día (`Dia (1)` … `Dia (31)`) para el uso de los 13 vehículos livianos.

Problemas concretos que arrastra ese esquema:

| Problema | Consecuencia |
|---|---|
| Un solo archivo, un solo editor por vez | Operaciones no puede cargar mientras otro imprime |
| La planilla se duplica todos los días | No hay historial consultable ni búsqueda |
| Nada valida solapamientos | Una persona o una unidad puede quedar asignada dos veces |
| Imprimir y repartir en papel | El chofer se entera tarde o pierde la hoja |
| Los checklists llegan sueltos por WhatsApp | No hay resumen ni trazabilidad |
| No hay vista de semana/mes | La planificación se maneja de memoria |

**Objetivo:** una central operativa web sobre PostgreSQL que reemplace los dos Excel, imprima los mismos PDFs que hoy y mande la salida por WhatsApp con un botón.

---

## 2. Alcance

### Entra

1. **Salidas de trabajo** — alta, edición, listado del día, historial. Reemplaza la hoja `Operacion` de GD 200.
2. **PDFs** — salida individual (formato de la hoja por unidad) y parte del día completo. También PDF de livianos y de checklists.
3. **Envío por WhatsApp** — botón que manda el resumen de la salida con sus observaciones a todo el personal asignado, vía Meta Cloud API.
4. **Vehículos livianos** — quién usó qué unidad, en qué horario, desde/hacia dónde. Reemplaza GD 208.
5. **Resumen de checklists** — ingesta de lo que ya llega por n8n/WhatsApp, con vista de recibidos, pendientes y observados.
6. **Calendario** — vista mes/semana/día alimentada por las salidas.
7. **Maestros** — personal, equipos, empresas del grupo, clientes, verificadores, operadores, lugares.

### No entra (por ahora)

- Facturación, remitos fiscales y cuentas corrientes → siguen en Odoo.
- Liquidación de horas del personal.
- GPS o seguimiento en tiempo real de las unidades.
- El chatbot de checklist en sí (ya existe en n8n; acá solo se consume el resultado).
- Transporte tercerizado (Montera / Rivas / FMB) → **ver punto 11, a definir**.

---

## 3. Stack propuesto

| Capa | Elección | Por qué |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | Front y back en un solo proyecto, un solo deploy |
| Estilos | **Tailwind + shadcn/ui** | Componentes de tabla y formulario ya resueltos |
| Base de datos | **PostgreSQL** (el que ya está) | Ya disponible, mismo motor que usa n8n |
| ORM | **Drizzle ORM** | SQL explícito, migraciones simples, liviano |
| Auth | **Auth.js (credentials)** con roles | Sin dependencia de proveedor externo |
| PDF | **Puppeteer** renderizando la misma vista HTML | El PDF sale idéntico a lo que se ve en pantalla; sin mantener dos maquetados |
| WhatsApp | **n8n** como intermediario hacia Meta Cloud API | Reutiliza la instancia `GruasOficial` que ya funciona y deja el token en un solo lugar |
| Deploy | Docker Compose junto a n8n | Misma infraestructura, red interna |

**Decisión importante:** la app **no llama directo a la API de Meta**. Llama a un webhook de n8n y n8n hace el envío. Motivos: el token permanente de sistema ya está configurado ahí, el manejo de errores y reintentos ya existe, y si mañana cambia el proveedor de WhatsApp no hay que tocar la app.

---

## 4. Modelo de datos

```sql
-- ============ MAESTROS ============

CREATE TABLE empresas (
  id            serial PRIMARY KEY,
  codigo        text UNIQUE NOT NULL,      -- GD01, GD02...
  razon_social  text NOT NULL,             -- "West Group SH"
  nombre_corto  text NOT NULL,             -- "West Group"
  cuit          text,
  activa        boolean NOT NULL DEFAULT true
);

CREATE TABLE personal (
  id             serial PRIMARY KEY,
  apellido_nombre text NOT NULL,
  legajo         text,                      -- GDL001
  documento      text,
  empresa_id     int REFERENCES empresas(id),
  puesto         text,                      -- "Operador de Grua 25/50 TN"
  telefono_wsp   text,                      -- formato E.164: 5491155782210
  es_chofer      boolean NOT NULL DEFAULT false,
  es_verificador boolean NOT NULL DEFAULT false,
  es_operador    boolean NOT NULL DEFAULT false,
  activo         boolean NOT NULL DEFAULT true
);
CREATE INDEX ON personal (activo, apellido_nombre);

CREATE TABLE equipos (
  id              serial PRIMARY KEY,
  interno         text UNIQUE NOT NULL,     -- GDU505
  nro_viejo       text,
  tipo            text NOT NULL,            -- ver tabla de tipos más abajo
  tns             numeric,
  marca           text,
  modelo          text,
  patente         text,
  equipo_asignado text,                     -- GDU600 (auxiliar que suele acompañar)
  activo          boolean NOT NULL DEFAULT true
);

CREATE TABLE clientes (
  id           serial PRIMARY KEY,
  razon_social text NOT NULL,
  cuit         text,
  odoo_id      int,                         -- si después se sincroniza con Odoo
  activo       boolean NOT NULL DEFAULT true
);

CREATE TABLE lugares (            -- Base, Casona, Concesionario, Domicilio,
  id     serial PRIMARY KEY,      -- Mantenimiento, Taller Externo, Otros
  codigo text UNIQUE NOT NULL,
  nombre text NOT NULL
);

-- ============ SALIDAS DE TRABAJO ============

CREATE TYPE estado_salida AS ENUM ('a_confirmar','en_ejecucion','finalizado','anulado');
CREATE TYPE gestion_salida AS ENUM ('permiso_corte','traslado_carreton','otros');

CREATE TABLE salidas (
  id                serial PRIMARY KEY,
  numero            text UNIQUE NOT NULL,   -- SAL-2026-0873
  fecha             date NOT NULL,
  orden_dia         smallint NOT NULL CHECK (orden_dia BETWEEN 1 AND 4),
  equipo_id         int NOT NULL REFERENCES equipos(id),
  equipo_aux_id     int REFERENCES equipos(id),
  empresa_id        int NOT NULL REFERENCES empresas(id),
  cliente_id        int REFERENCES clientes(id),
  ot                text,
  remito            text,
  hora_salida       time,
  lugar_carga       text,
  contacto_carga    text,
  telefono_carga    text,
  lugar_descarga    text,
  contacto_descarga text,
  telefono_descarga text,
  verificador_id    int REFERENCES personal(id),
  operador_id       int REFERENCES personal(id),
  gestion           gestion_salida,
  estado            estado_salida NOT NULL DEFAULT 'a_confirmar',
  observaciones     text,
  creado_por        int REFERENCES usuarios(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fecha, equipo_id, orden_dia)
);
CREATE INDEX ON salidas (fecha, hora_salida);
CREATE INDEX ON salidas (estado);

CREATE TYPE rol_salida AS ENUM
  ('chofer','operador_grua','jefe_cuadrilla','ayudante','acompanante');

CREATE TABLE salida_personal (
  salida_id   int NOT NULL REFERENCES salidas(id) ON DELETE CASCADE,
  personal_id int NOT NULL REFERENCES personal(id),
  rol         rol_salida NOT NULL,
  es_suplente boolean NOT NULL DEFAULT false,
  PRIMARY KEY (salida_id, personal_id)
);

CREATE TABLE salida_envios (            -- trazabilidad de cada WhatsApp enviado
  id            serial PRIMARY KEY,
  salida_id     int NOT NULL REFERENCES salidas(id) ON DELETE CASCADE,
  personal_id   int REFERENCES personal(id),
  telefono      text NOT NULL,
  plantilla     text NOT NULL,            -- salida_trabajo_v1
  wamid         text,                     -- id del mensaje que devuelve Meta
  estado        text NOT NULL,            -- enviado | entregado | leido | error
  error_detalle text,
  enviado_at    timestamptz NOT NULL DEFAULT now()
);

-- ============ VEHICULOS LIVIANOS ============

CREATE TYPE estado_liviano AS ENUM ('en_base','en_uso','taller','no_disponible');

CREATE TABLE uso_livianos (
  id              serial PRIMARY KEY,
  fecha           date NOT NULL,
  equipo_id       int NOT NULL REFERENCES equipos(id),
  personal_id     int REFERENCES personal(id),
  lugar_salida    text,
  hora_salida     time,
  lugar_llegada   text,
  hora_llegada    time,
  uso             text,                   -- motivo: obra, trámites, repuestos...
  observaciones   text,
  estado          estado_liviano NOT NULL DEFAULT 'en_base',
  registrado_por  int REFERENCES usuarios(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON uso_livianos (fecha, equipo_id);

-- ============ CHECKLISTS (ingesta desde n8n) ============

CREATE TYPE resultado_checklist AS ENUM ('sin_novedad','con_observacion','pendiente');

CREATE TABLE checklists (
  id           serial PRIMARY KEY,
  fecha        date NOT NULL,
  equipo_id    int REFERENCES equipos(id),
  personal_id  int REFERENCES personal(id),
  telefono     text,
  resultado    resultado_checklist NOT NULL DEFAULT 'pendiente',
  observaciones text,
  recibido_at  timestamptz,
  revisado_por int REFERENCES usuarios(id),
  revisado_at  timestamptz,
  payload      jsonb,                     -- lo que manda n8n tal cual
  UNIQUE (fecha, equipo_id)
);

CREATE TABLE checklist_items (
  id           serial PRIMARY KEY,
  checklist_id int NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  item         text NOT NULL,             -- "Neumáticos"
  ok           boolean,
  comentario   text
);

CREATE TABLE checklist_adjuntos (
  id           serial PRIMARY KEY,
  checklist_id int NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  url          text NOT NULL,
  tipo         text
);

-- ============ GUARDIAS Y USUARIOS ============

CREATE TABLE guardias (
  id          serial PRIMARY KEY,
  fecha       date NOT NULL,
  rol         text NOT NULL,              -- chofer_grua | chofer_camion | ayudante
  personal_id int NOT NULL REFERENCES personal(id),
  UNIQUE (fecha, rol, personal_id)
);

CREATE TYPE rol_usuario AS ENUM ('admin','operaciones','consulta','mantenimiento');

CREATE TABLE usuarios (
  id            serial PRIMARY KEY,
  personal_id   int REFERENCES personal(id),
  email         text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  rol           rol_usuario NOT NULL DEFAULT 'consulta',
  activo        boolean NOT NULL DEFAULT true
);

CREATE TABLE auditoria (
  id         bigserial PRIMARY KEY,
  usuario_id int REFERENCES usuarios(id),
  entidad    text NOT NULL,
  entidad_id int,
  accion     text NOT NULL,
  antes      jsonb,
  despues    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Reglas de negocio que la base tiene que hacer cumplir

1. `UNIQUE (fecha, equipo_id, orden_dia)` — una unidad no puede tener dos "Trabajo 1" el mismo día.
2. **Aviso de solapamiento de personal** (validación en la app, no bloqueante): si una persona ya está en otra salida el mismo día con horarios que se pisan, se muestra advertencia pero se permite guardar. Hoy el Excel no avisa nada.
3. **Aviso de unidad ocupada**: mismo criterio para el equipo.
4. Una salida en estado `finalizado` no se edita; se reabre con permiso de admin y queda en auditoría.
5. Numeración `SAL-<año>-<secuencia>` generada por secuencia de Postgres, nunca por el usuario.

---

## 5. Mapeo Excel → sistema

Verificación de que no quede nada afuera.

### GD 200 — hoja `Operacion` (por trabajo)

| Celda / campo Excel | Campo del sistema |
|---|---|
| `B` Unidad (GDU) + marca/modelo/patente | `salidas.equipo_id` → `equipos` |
| `E` Equipos (GDU000 auxiliares) | `salidas.equipo_aux_id` |
| `C` Q PERS | calculado: `count(salida_personal)` |
| `D`/`F` Personal titulares y suplentes | `salida_personal` (con `es_suplente`) |
| `G` Seleccione Empresa | `salidas.empresa_id` |
| `H` Cliente | `salidas.cliente_id` |
| `J` OT | `salidas.ot` |
| `L` Remito | `salidas.remito` |
| `L` Hora de Salida | `salidas.hora_salida` |
| `H` Lugar Carga / Contacto / Teléfono | `lugar_carga`, `contacto_carga`, `telefono_carga` |
| `H` Lugar Descarga / Contacto / Teléfono | `lugar_descarga`, `contacto_descarga`, `telefono_descarga` |
| `H` Verificador | `salidas.verificador_id` |
| `K` Operador | `salidas.operador_id` |
| `B` Seleccione Gestion | `salidas.gestion` |
| `H` Seleccione Estado | `salidas.estado` |
| Trabajo 1 / 2 / 3 / 4 (columnas G, Q, AA, AK) | `salidas.orden_dia` = 1..4 |
| Hoja `Observaciones` de la hoja por unidad | `salidas.observaciones` |

### GD 200 — maestros

| Hoja | Tabla destino | Filas |
|---|---|---|
| `Personal` | `personal` | **49 personas** (descartando las 3 filas placeholder "Seleccione…") |
| `Equipos` | `equipos` | **94 unidades reales** (la hoja tiene 106 filas, pero 9 son catálogos de las hojas de transporte tercerizado, 2 son comodines y 4 son un bloque duplicado) |
| `Empresas` | `empresas` | 8 empresas del grupo + catálogos de Estado y Gestión |
| `Verificador` | flag `personal.es_verificador` | 5 personas |
| `Operador` | flag `personal.es_operador` | 5 personas (una de ellas no está en el maestro de Personal) |
| `GUARDIAS` | `guardias` | 6 puestos por día |

> **Números finales tras cruzar los dos libros** (verificados corriendo la importación):
> **10 empresas**, **55 personas**, **96 equipos**, **7 lugares**.
> La diferencia con la columna de arriba viene de GD 208, que aporta 2 empresas,
> 6 personas y 2 unidades livianas que no están en GD 200.

### Tipos de equipo que hay hoy en la hoja `Equipos`

| Tipo | Unidades | | Tipo | Unidades |
|---|---|---|---|---|
| Camión | 22 | | Plataforma | 6 |
| Grúa | 22 | | Hidrogrúa | 3 |
| Liviano | 16 | | Tractor | 3 |
| Autoelevador | 7 | | Carretón | 2 |
| Equipos | 6 | | Semirremolque | 2 |

Además hay 11 filas **sin tipo cargado** y varias entradas que en realidad son proveedores o categorías sueltas (`MARCELLINI`, `GOMATRO`, `PETTINARI`, `SALTO`, `Movimiento Stock`, `Equipos Varios`, `Trailer Amarok`, `Boggy`, `Brazo articulado`). Hay que normalizar esa lista con operaciones antes de migrar: el campo `tipo` es el que después agrupa el calendario y los filtros.

### GD 208 — hojas `Dia (n)`

| Columna Excel | Campo del sistema |
|---|---|
| Interno / Tipo / Marca / Modelo / Patente | `equipos` (por `interno`) |
| Personal Asignado | `uso_livianos.personal_id` |
| Salida — Lugar / Horario | `lugar_salida`, `hora_salida` |
| Llegada — Lugar / Horario | `lugar_llegada`, `hora_llegada` |
| Uso | `uso_livianos.uso` |
| Observaciones | `uso_livianos.observaciones` |
| Estado | `uso_livianos.estado` |
| Hoja `Empresas` filas 28-35 | `lugares` (Base, Casona, Concesionario, Domicilio, Otros, Mantenimiento, Taller Externo) |

**Inconsistencias detectadas en los archivos.** La lista salió de correr la importación de verdad contra los dos libros; el detalle fila por fila queda en `docs/informe-importacion.md` cada vez que se ejecuta el script.

- **Cinco filas de la hoja `Equipos` tienen las columnas corridas un lugar** (filas 100 a 104: los carretones y semirremolques). La marca quedó en la columna Tipo, el modelo en TNs y la patente en Marca. Por eso aparecían "tipos" como MARCELLINI, GOMATRO, PETTINARI y SALTO, que son marcas. Cuatro de esas cinco filas además son una copia de filas que ya estaban bien más arriba; solo GDU203 existe únicamente en el bloque corrido.
- **Nueve filas de la hoja `Equipos` no son equipos**: son los valores de los desplegables de las hojas de transporte tercerizado (Transporte Montera, Transporte Rivas, Transporte FBM, Transporte EusKal, Carreton, Semirremolque, Chofer Montera, Almaraz Miguel).
- **Dos internos son comodines**, no unidades: `GDUVAR` ("Equipos Varios") y `GDUXXX` ("Movimiento Stock"). Si operaciones los usa para registrar algo, hay que resolverlo de otra forma en la app.
- **La patente OGZ 054 figura en dos internos**: GDU055 (VW Amarok) y GDU350 (Trailer Amarok).
- **Cinco personas figuran en la empresa "Grupo Daniele"**, que no es ninguna de las 8 del maestro: es el nombre del holding. Hay que decidir a qué empresa pertenecen.
- **"Stuto Abril Daiana" figura como operador** pero no está en el maestro de Personal.

Y las que ya estaban anotadas:

- `GDU061` y `GDU064` aparecen **duplicados** en las hojas `Dia (n)` de GD 208, con la patente escrita distinto (`AF 677 IV` / `AF677IV`, `AH210SR` repetido).
- La hoja `Equipos` de GD 200 tiene una fila con interno `111` en vez de `GDU111`.
- Los nombres de empresa no coinciden entre los dos libros: en GD 200 `Movimientos Industriales Oeste`, en GD 208 `Daniele Nicolas Marvin`. Hay que unificar por CUIT.
- Los códigos `GDE0x` de `Personal` en GD 200 no coinciden con los de GD 208 para la misma persona.
- Hay personal sin legajo y sin documento (Rios Franco A., Salvo Jonathan N., Toloza Lucas).
- 11 equipos no tienen `tipo` cargado y 9 "tipos" son en realidad nombres de proveedor o categorías sueltas.
- El legajo `GDL012` está repetido en dos personas distintas (Garay Esteban H. y Giambroni Sergio L.).
- **Ninguno de los dos archivos tiene teléfonos del personal.** Es el dato que falta para que funcione el envío por WhatsApp.

---

## 6. Pantallas

Las siete pantallas están dibujadas en el canvas. Resumen de qué hace cada una:

**1. Tablero del día** — KPIs (salidas, estados, checklists recibidos, livianos fuera de base), tabla de salidas de hoy, checklists pendientes, livianos en uso y guardia del día. Dos botones grandes: *Imprimir parte del día* y *Enviar salidas por WhatsApp*.

**2. Calendario** — vistas mes / semana / día, color por tipo de unidad, borde punteado para las salidas a confirmar. Filtro por unidad y por empresa. Se alimenta solo de `salidas`.

**3. Alta de salida** — formulario en tres bloques (unidad y trabajo · carga y descarga · personal), selector de trabajo 1-4 de la misma unidad, panel derecho con vista previa, acciones al guardar (enviar WhatsApp, pedir checklist, publicar en calendario) y avisos de solapamiento.

**4. Vehículos livianos** — grilla del día editable en línea, con lugar y hora de salida y de llegada, uso, observaciones y estado. Alerta cuando pasan más de 12 h sin hora de regreso. Botón de PDF del día y exportación mensual.

**5. Resumen de checklists** — lista del día (recibidos, con observación, pendientes) y detalle con los ítems, el texto libre del chofer y las fotos. Botones para generar aviso a mantenimiento y para recordar por WhatsApp a los pendientes.

**6. PDF de la salida** — A4 vertical, replica la hoja por unidad del Excel: cabecera con empresa del grupo y número, franja de unidad/patente/hora/OT, cliente, carga y descarga con contactos, tabla de personal, verificador/operador/gestión, observaciones y tres firmas.

**7. Envío por WhatsApp** — modal con destinatarios (marca los que no tienen teléfono cargado), vista previa del mensaje, opción de adjuntar el PDF e incluir a la guardia.

---

## 7. Reportes en PDF

Todos se generan con Puppeteer sobre una ruta `/print/...` de la misma app, así el PDF sale igual a la pantalla.

| Reporte | Ruta | Contenido |
|---|---|---|
| Salida individual | `/print/salida/[id]` | 1 página A4 (mockup 6) |
| Parte del día | `/print/dia/[fecha]` | Portada con resumen + una página por salida |
| Livianos del día | `/print/livianos/[fecha]` | Grilla del día en horizontal |
| Livianos del mes | `/print/livianos/mes/[aaaa-mm]` | Una página por día + totales por unidad |
| Checklists del día | `/print/checklists/[fecha]` | Recibidos, pendientes y observaciones |

Los PDFs se guardan en disco con el nombre `SAL-2026-0873.pdf` para poder adjuntarlos al WhatsApp sin regenerarlos.

---

## 8. Integración con WhatsApp

### Flujo de envío

```
App (botón Enviar)
  → POST al webhook de n8n con { salida_id, destinatarios[], pdf_url }
    → n8n arma los parámetros de la plantilla
    → Meta Cloud API (instancia GruasOficial)
    → n8n responde con los wamid
  → App guarda una fila en salida_envios por destinatario
```

### Plantilla de Meta

Para iniciar una conversación (fuera de la ventana de 24 h) **hace falta una plantilla aprobada por Meta**. Hay que darla de alta antes de programar esta parte. Propuesta `salida_trabajo_v1`, categoría *Utility*:

```
*SALIDA DE TRABAJO — {{1}}*

Unidad: {{2}}
Hora de salida: {{3}}
Cliente: {{4}}

Carga: {{5}}
Descarga: {{6}}

Cuadrilla: {{7}}

Observaciones: {{8}}

Respondé OK para confirmar recepción.
```

Variables: 1 fecha · 2 unidad + patente · 3 hora · 4 cliente + OT · 5 lugar y contacto de carga · 6 lugar y contacto de descarga · 7 nombres de la cuadrilla · 8 observaciones de operaciones.

**Nota sobre el formato de número:** los números van como `54` + `9` + área + número, sin el `+` y sin el `15` (ejemplo: `5491155782210`). El `9` va siempre. Hay que normalizar a E.164 al cargar los teléfonos en el maestro de personal.

### Webhook de estados

n8n ya recibe los callbacks de Meta. Se agrega un nodo que haga `PATCH` a `/api/envios/{wamid}` para actualizar `salida_envios.estado` a entregado / leído / error, y que el "OK" que responde el chofer quede registrado como confirmación de recepción.

---

## 9. Integración con los checklists (n8n)

El flujo de checklist ya existe. Solo se agrega el volcado a la base:

- n8n hace `POST /api/checklists` con `{ fecha, interno, telefono, items[], observaciones, adjuntos[] }`.
- La app resuelve `equipo_id` por `interno` y `personal_id` por teléfono, y guarda además el JSON crudo en `checklists.payload` (así nunca se pierde información si cambia el formato).
- Autenticación del endpoint con un token fijo en header (`x-api-key`), guardado en las credenciales de n8n.
- Todas las mañanas, un cron de la app crea las filas `pendiente` para las unidades que tienen salida ese día. Eso es lo que hace que el contador diga "14 de 17".

---

## 10. Roles y permisos

| Rol | Puede |
|---|---|
| **admin** | Todo, incluye maestros, reabrir salidas finalizadas y ver auditoría |
| **operaciones** | Crear y editar salidas, cargar livianos, enviar WhatsApp, imprimir |
| **mantenimiento** | Ver checklists, marcar revisado, generar avisos |
| **consulta** | Solo lectura e impresión |

Filtro transversal por empresa del grupo: un usuario puede ver todas las empresas o solo algunas (`usuarios_empresas`, tabla puente a agregar en fase 1 si hace falta).

---

## 11. Puntos a definir con la empresa

Están ordenados por urgencia: los primeros bloquean el arranque.

1. **Teléfonos del personal.** No están en ninguno de los dos Excel y son imprescindibles para el envío por WhatsApp. ¿Quién los junta y en qué formato?
2. **¿Quién carga las salidas?** ¿Solo operaciones, o cada empresa del grupo carga las suyas?
3. **Plantilla de Meta.** Hay que crearla y esperar la aprobación (suele tardar de unas horas a un par de días). Conviene iniciar el trámite ya.
4. **Cliente y OT: ¿vienen de Odoo?** Odoo ya tiene el padrón de clientes y está conectado a ARCA. Si el cliente y la OT salen de ahí, se evita un maestro duplicado. Definir si se sincroniza o si la central mantiene su propia lista.
5. **Transporte tercerizado** (hojas Resumen Montera / Rivas / FMB). ¿Entra en esta primera versión o queda para después? El modelo de datos lo soporta agregando un tipo de salida sin `equipo_id` propio y un campo de proveedor.
6. **Numeración de la salida.** ¿`SAL-2026-0873` correlativo global, o uno por empresa del grupo?
7. **Guardias.** ¿Se siguen cargando a mano por día o se arma una rotación automática?
8. **Retención y migración del histórico.** ¿Se importan los Excel viejos o se arranca de cero desde una fecha de corte?
9. **Firma del cliente.** ¿Alcanza con la firma en papel del PDF, o quieren conformidad digital (firma en el celular del chofer)?

---

## 12. Plan de trabajo por fases

Estimación para desarrollo asistido con Claude Code. Cada fase entrega algo usable.

### Fase 0 — Preparación (3-4 días)
- Definir los puntos 1, 2 y 3 del capítulo anterior.
- Dar de alta la plantilla en Meta (es lo que más tarda por depender de terceros).
- Limpiar y unificar los maestros (duplicados de GDU061/GDU064, interno `111`, nombres de empresa por CUIT).
- Levantar el proyecto: Next.js + Drizzle + Postgres + Docker, y el login.

### Fase 1 — Núcleo de salidas (1,5-2 semanas)
- Migración de maestros desde los Excel (script único, idempotente).
- ABM de personal, equipos, empresas, clientes y lugares.
- Alta, edición y listado de salidas, con las validaciones de solapamiento.
- PDF de la salida individual y parte del día.
- **Entregable:** operaciones ya puede dejar de usar la hoja `Operacion`.

### Fase 2 — WhatsApp (4-5 días)
- Webhook de n8n para el envío y para los estados.
- Modal de envío, registro en `salida_envios`, adjunto del PDF.
- Botón de envío masivo del parte del día desde el tablero.
- **Entregable:** se deja de repartir la hoja en papel.

### Fase 3 — Vehículos livianos (4-5 días)
- Grilla del día con edición en línea, alertas de sin-regreso.
- PDF del día y exportación mensual.
- **Entregable:** se deja de usar GD 208.

### Fase 4 — Checklists (4-5 días)
- Endpoint de ingesta desde n8n, cron de pendientes.
- Pantalla de resumen y detalle, aviso a mantenimiento.
- **Entregable:** los checklists dejan de ser mensajes sueltos.

### Fase 5 — Calendario y tablero (4-5 días)
- Vistas mes / semana / día, filtros, KPIs del tablero.
- **Entregable:** planificación de la semana a la vista.

### Fase 6 — Cierre (3-4 días)
- Auditoría, permisos por empresa, backups, manual corto para el usuario.
- Acompañamiento en paralelo con el Excel durante una semana antes de apagarlo.

**Total estimado: 6 a 7 semanas** de desarrollo, sin contar las demoras de terceros (aprobación de Meta, recolección de teléfonos).

---

## 13. Cómo arrancar con Claude Code

Prompt sugerido para la primera sesión en VS Code:

> Vamos a construir la Central Operativa de Gruas Daniele. Leé `central-operativa-gruas-daniele-spec.md` completo antes de escribir código.
>
> Arrancamos por la Fase 0 y la Fase 1. Creá el proyecto Next.js 15 con App Router, TypeScript, Tailwind, shadcn/ui y Drizzle ORM contra PostgreSQL, con Docker Compose.
>
> Primero armá el esquema de base de datos exactamente como está en el capítulo 4 del spec, con las migraciones de Drizzle. Después escribí el script de migración que lee los dos Excel (`GD 200` y `GD 208`) y carga los maestros, aplicando las correcciones de inconsistencias del capítulo 5. El script tiene que ser idempotente: si lo corro dos veces no debe duplicar nada.
>
> No avances a las pantallas hasta que el esquema y la migración estén andando y me muestres el conteo de filas cargadas por tabla.

---

*Documento generado a partir del relevamiento de los archivos GD 200 y GD 208 del 13/09/2026. Los datos de ejemplo del mockup (OT, remitos, teléfonos, clientes) son inventados; las unidades, el personal, las empresas y los catálogos de estados son los reales de los Excel.*

---

## 14. Gestión de herramientas (pedido del 21/09/2026)

Pedido nuevo del cliente, posterior al relevamiento de los Excel. No sale de ninguna planilla: hoy no hay registro de dónde está cada herramienta.

### Qué hay que resolver

1. **Dónde está cada herramienta** y desde cuándo.
2. **Quién la tiene**, para que la responsabilidad quede documentada.
3. Que al entregarla le llegue al empleado un **formulario a su WhatsApp** para confirmar que la recibió.

### Por qué no cuelga de la salida de trabajo

La primera idea es asignar las herramientas dentro de la salida, como se asigna la cuadrilla. No alcanza:

- Una salida es **un día**; una herramienta queda en poder de alguien **semanas**. Si el dato viviera en la salida, al día siguiente la herramienta no estaría en ningún lado.
- Hay herramientas que **viven arriba de una unidad** (el juego de eslingas de la GDU505) y nunca pasan por una salida.
- Hay herramientas **en el taller o perdidas**, que tampoco tienen salida.

El dato de fondo es la **custodia**: quién o qué la tiene *ahora*. La salida es **uno de los momentos** en que la custodia cambia, no su dueña. Por eso la salida engancha —desde el alta se entregan herramientas y quedan en el PDF— pero el registro vive aparte y sobrevive al día.

### Custodia

Una herramienta está siempre en exactamente uno de tres lugares:

| Custodia | Ejemplo | Para qué |
|---|---|---|
| **Persona** | Gómez, Juan | la que se llevó alguien: es la que hay que reclamar |
| **Unidad** | GDU505 | la que vive arriba del equipo |
| **Lugar** | Base, Taller Externo | la que está guardada o en reparación |

«Disponible» no es un estado aparte: es una herramienta **activa** cuya custodia es un lugar.

### Modelo de datos

```sql
CREATE TYPE estado_herramienta AS ENUM ('activa','en_reparacion','perdida','baja');
CREATE TYPE tipo_entrega AS ENUM ('entrega','devolucion','traslado','baja');

CREATE TABLE herramientas (
  id                  serial PRIMARY KEY,
  codigo              text UNIQUE NOT NULL,        -- GDH001
  nombre              text NOT NULL,               -- "Amoladora angular 4 1/2"
  tipo                text,                        -- Electrica | Manual | Eslinga | Medicion
  marca               text,
  modelo              text,
  numero_serie        text,
  empresa_id          int REFERENCES empresas(id), -- de qué empresa del grupo es
  estado              estado_herramienta NOT NULL DEFAULT 'activa',
  -- Custodia actual. Es el último movimiento, guardado acá para que el listado
  -- no tenga que recorrer el historial de cada herramienta.
  custodia_personal_id int REFERENCES personal(id),
  custodia_equipo_id   int REFERENCES equipos(id),
  custodia_lugar_id    int REFERENCES lugares(id),
  custodia_desde       timestamptz,
  custodia_entrega_id  int,                        -- para saber si está confirmada
  observaciones       text,
  CHECK (num_nonnulls(custodia_personal_id, custodia_equipo_id, custodia_lugar_id) = 1)
);

-- El acta: una entrega puede llevar varias herramientas a la misma persona.
-- Es lo que se confirma por WhatsApp, de una sola vez.
CREATE TABLE herramienta_entregas (
  id                serial PRIMARY KEY,
  tipo              tipo_entrega NOT NULL,
  hacia_personal_id int REFERENCES personal(id),
  hacia_equipo_id   int REFERENCES equipos(id),
  hacia_lugar_id    int REFERENCES lugares(id),
  salida_id         int REFERENCES salidas(id),   -- si salió de una salida de trabajo
  entregado_por     int REFERENCES usuarios(id),
  observaciones     text,
  token_hash        text,                          -- el link del formulario, hasheado
  confirmado_at     timestamptz,
  confirmado_nota   text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(hacia_personal_id, hacia_equipo_id, hacia_lugar_id) = 1)
);

-- Una línea por herramienta, con de dónde venía.
CREATE TABLE herramienta_movimientos (
  id                serial PRIMARY KEY,
  entrega_id        int NOT NULL REFERENCES herramienta_entregas(id) ON DELETE CASCADE,
  herramienta_id    int NOT NULL REFERENCES herramientas(id),
  desde_personal_id int REFERENCES personal(id),
  desde_equipo_id   int REFERENCES equipos(id),
  desde_lugar_id    int REFERENCES lugares(id),
  UNIQUE (entrega_id, herramienta_id)
);
```

El historial de una herramienta es `herramienta_movimientos` filtrado por `herramienta_id`; el estado actual está cacheado en `herramientas` y se escribe en la misma transacción que el movimiento.

### La confirmación

El formulario es una ruta de la app, **no un mensaje con botones**: así el empleado ve qué le entregaron, ítem por ítem, y puede dejar una nota («falta el cargador»).

1. Al guardar la entrega se genera un **token al azar**. En la base queda solo el hash.
2. El link `/confirmar/<token>` se manda al WhatsApp del empleado. Hasta que n8n esté configurado, se copia y se manda a mano.
3. El empleado abre, ve la lista y confirma. **Sin login**: el token es la credencial.
4. Queda `confirmado_at`. Si no confirma, la entrega figura como **sin confirmar**.

El token sirve **una sola vez** y vence. No se puede reusar para ver qué tiene cargado otro.

### Reglas

1. Una herramienta tiene **siempre** exactamente una custodia. Sin custodia no se puede dar de alta.
2. La custodia cacheada en `herramientas` y el último movimiento **no pueden discrepar**: se escriben juntos o no se escribe ninguno.
3. Una herramienta `baja` o `perdida` no se puede entregar.
4. Entregar una herramienta que ya tiene otro **no se bloquea**: se avisa de quién venía. Igual que el solapamiento de personal.
5. Toda entrega deja registro en `auditoria`, como cualquier otra escritura.

### Alertas

- Entregas **sin confirmar** después de 48 h.
- Herramientas en poder de una persona hace **más de 30 días** sin devolver.

### Qué falta de la empresa

- **El listado de herramientas** para arrancar el inventario: código, nombre, y dónde está hoy cada una.
- Definir si el código lo pone la empresa o lo genera el sistema (`GDH` + tres dígitos, como los internos).

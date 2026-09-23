# Auditoría de la Central Operativa

23/09/2026. Lo que está hecho, lo que falta y lo que conviene arreglar, por
orden. Se actualiza cuando se tacha algo.

---

## Qué está hecho

| Área | Estado |
|---|---|
| Salidas de trabajo, con validaciones y numeración por secuencia | Hecho |
| Vehículos livianos (reemplaza el GD 208) | Hecho |
| PDF de salida, parte del día, livianos del día y del mes | Hecho |
| Calendario mes / semana / día | Hecho |
| Checklists (lado de la app) | Hecho |
| Guardias | Hecho |
| Maestros, usuarios y roles | Hecho |
| Registro de cambios | Hecho |
| Herramientas, con confirmación por link | Hecho |
| **Envío por WhatsApp** | **Sin empezar.** Están la tabla `salida_envios` y el permiso; no existe ni el POST al webhook ni `/api/envios/[wamid]` |

~8.900 líneas, 41 rutas, 14 scripts de prueba.

---

## Arreglado el 23/09

- **Un usuario dado de baja seguía navegando.** La sesión es un JWT y no se
  revalidaba nunca: el token seguía sirviendo treinta días. Cambiarle el rol
  tampoco tomaba efecto. Ahora cada pedido pregunta por la fila del usuario
  (`usuarioDeLaSesion`), el rol sale de la base y el token dura ocho horas.
- **El ingreso no tenía límite de intentos.** Cinco fallos bloquean el correo
  quince minutos. El registro es en memoria: si algún día corren varias
  instancias, tiene que pasar a la base.
- **Se podía averiguar qué correos existen por el tiempo de respuesta**: si el
  correo no estaba, la respuesta volvía al instante. Ahora se calcula un hash
  de descarte para que tarde lo mismo.
- **Los PDF se armaban sobre pantallas de error** (ver `docs/estado-del-proyecto.md`).

---

- **No se podían buscar las salidas.** El listado era solo por día. Ahora está
  `/salidas/buscar`: por número, cliente, OT, remito, unidad, patente, lugar o
  apellido de quien fue, con rango de fechas y estado, y respetando el filtro
  de empresas. Era lo que el capítulo 1 del spec le reprochaba al Excel.

---

## Lo que queda, por orden

### 1. Lint y CI 🟠

- ESLint **no está configurado** y el build lo ignora (`ignoreDuringBuilds`).
  Lo único que corre es `tsc`.
- Las 14 pruebas corren si alguien se acuerda. Un GitHub Action que levante
  Postgres, haga el build y corra la suite cierra el ciclo.

### 2. WhatsApp 🟡

Última fase por decisión del 16/09. Depende de la plantilla aprobada por Meta y
de los teléfonos del personal, que no están cargados.

Del lado de la app falta: el POST al webhook de n8n, `/api/envios/[wamid]` para
los estados, y el botón en la salida. El link de confirmación de herramientas
usa el mismo camino.

### 3. Cosas que van a molestar cuando crezca 🟡

- **`auditoria` no se purga y no tiene índice por `created_at`**, que es por
  donde ordena la pantalla. Con 200 filas no se nota; con 200.000 sí.
- **El parte del día hace ~6 consultas por salida.** Medido: 45 salidas son
  578 ms de render y 2,7 s de PDF. Hoy alcanza.
- **Los PDF de `PDF_STORAGE_PATH` no se limpian nunca.**
- **La búsqueda hace `ILIKE` sobre varias columnas y no usa índices.** Con
  unos miles de salidas al año no se nota; si algún día molesta, la salida es
  un índice de texto (`pg_trgm` o una columna `tsvector`).
- **El token de impresión se marca usado en memoria**: con dos instancias, los
  PDF fallarían salteado.

### 4. Menores 🟢

- La comparación de `x-api-key` no es de tiempo constante.
- `uso_livianos` no tiene único por (fecha, unidad): una unidad puede tener dos
  movimientos el mismo día. La grilla lo soporta; si operaciones prefiere uno
  solo, hay que agregar la restricción.
- No se puede exportar a Excel ni CSV.
- Herramientas: no se puede reemitir el link de confirmación ni anular una
  entrega (se corrige con otro movimiento, que queda en el historial).

---

## Abierto, sin diagnosticar

**Error de hidratación de React (#418).** Apareció dos veces en unos siete
barridos completos, en rutas distintas (`/maestros/equipos`,
`/maestros/usuarios/nuevo`). No se pudo reproducir: veinte cargas dirigidas,
cero. Coincide en el tiempo con haber sacado el `<head>` del layout raíz el
22/09. No se le inventó un arreglo.

---

## Lo que depende de la empresa

1. **Los teléfonos del personal.** Sin eso no hay WhatsApp.
2. **La plantilla aprobada por Meta.**
3. **El listado de herramientas** para cargar el inventario.
4. **Definir si el cliente y la OT salen de Odoo.**
5. **Dejar el respaldo corriendo en el VPS.** El script está y se probó; la
   línea de cron la pone quien tiene el SSH.

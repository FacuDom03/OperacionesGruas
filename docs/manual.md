# Manual de la Central Operativa

Cómo se usa, pantalla por pantalla. Está escrito para quien va a cargar las
salidas todos los días, no para quien programa.

La app vive en **https://operacionesgruasdaniele.tech** y se entra con el
correo y la contraseña que da el administrador.

---

## Lo primero

### Entrar

Correo y contraseña. Si no entrás, pedile al administrador que revise tu
usuario en **Maestros → Usuarios**: puede estar desactivado.

### Elegir con qué empresas trabajar

Arriba a la derecha dice **Empresa: Todas (10)**. Pinchando ahí elegís una, dos
o las que quieras, y apretás **Aplicar**. A partir de ahí las salidas, el
calendario y el parte del día muestran solo esas empresas.

Sirve para no tener que buscar un trabajo de West Group entre los de las diez.
Los equipos y el personal **no** se filtran: las unidades son de uso compartido
del grupo.

La elección queda guardada para la próxima vez que entres.

### Moverse de día

Todas las pantallas que son de un día tienen el mismo control arriba:

- **‹** y **›** van al día anterior y al siguiente
- el calendario aplica **apenas elegís la fecha**, no hay que apretar nada más
- **Hoy** vuelve al día de hoy

---

## Tablero

Es la pantalla de arranque. De un vistazo:

| Tarjeta | Qué cuenta |
|---|---|
| Salidas del día | cuántos trabajos hay hoy y cuántas unidades están asignadas |
| En ejecución | las que ya salieron, y a qué hora salió la primera |
| A confirmar | las que todavía no arrancaron, y cuántas no tienen remito |
| Checklists recibidos | cuántos llegaron sobre los que se esperaban |
| Livianos fuera de base | cuántos están afuera y cuántos sin hora de regreso |

Abajo, la lista de las salidas de hoy y la tarjeta de **Guardia de hoy**.

---

## Salidas de trabajo

Reemplaza la hoja `Operacion` del GD 200.

### Cargar una salida

**+ Nueva salida**. Los campos que importan:

- **Unidad**: el interno, `GDU` y tres números. Una unidad puede tener hasta
  **cuatro trabajos en el mismo día**.
- **Empresa**: de cuál del grupo sale el trabajo.
- **Hora de salida**.
- **Cliente**: se escribe libre. Mientras escribís aparecen los que ya están
  cargados; si el que ponés es nuevo, **se guarda solo en el maestro** al
  guardar la salida.
- **Carga y descarga**: lugar, dirección y observación.
- **Cuadrilla**: chofer, operador de grúa, jefe de cuadrilla, ayudantes y
  acompañantes. Cada uno puede marcarse como suplente.

El **número** (`SAL-2026-0873`) no se escribe: lo pone el sistema.

### Los avisos

Si la persona o la unidad que elegiste ya está asignada ese día en un horario
que se pisa, aparece un aviso y un botón **Guardar igual**.

**Es un aviso, no un bloqueo.** A veces la superposición es real y está bien
(un trabajo corto que llega antes del siguiente). El sistema avisa y decidís vos.

### Los estados

| Estado | Qué significa |
|---|---|
| A confirmar | está cargada pero todavía no salió |
| En ejecución | la unidad está en la calle |
| Finalizado | el trabajo terminó |
| Anulado | no se hizo |

Una salida **finalizada no se edita**. Si hay que corregirla, la reabre un
administrador con **Reabrir (queda registrado)**, y esa reapertura queda en el
registro de cambios con el nombre de quien la hizo.

### Imprimir

- **PDF de la salida**: una hoja A4, con el mismo formato del Excel y las tres
  firmas.
- **PDF del día**: la portada con el resumen y una hoja por salida. Respeta la
  empresa que tengas elegida arriba.

---

## Vehículos livianos

Reemplaza el GD 208 completo. Una fila por unidad liviana, y se edita en la
misma pantalla: interno, personal asignado, lugar y hora de salida, lugar y
hora de llegada, uso, estado y observaciones.

**Cada fila se guarda sola.** Si te equivocás en una, no perdés lo que cargaste
en las demás.

Cuando una unidad lleva **más de 12 horas sin hora de regreso**, aparece un
aviso arriba y en la propia fila. No es un error: es para que alguien pregunte.

De acá salen el **PDF del día** y el **PDF del mes**, los dos apaisados porque
la grilla tiene diez columnas.

---

## Checklists

El chofer sigue mandando el checklist por WhatsApp, como siempre. Lo que cambia
es que ahora queda registrado.

- Arriba, los contadores del día: recibidos, con observación, pendientes.
- Abajo, la lista. Pinchando una fila se ven los ítems, el texto del chofer y
  las fotos.
- Mantenimiento y los administradores pueden marcarlo como **revisado**.

Si el chofer vuelve a mandar el checklist de esa unidad ese día **con otro
contenido**, el «revisado» se borra: lo que se revisó ya no es lo que hay. Un
reenvío idéntico no lo toca.

---

## Calendario

Lo que el Excel nunca pudo mostrar: **mes, semana y día**.

- Cada trabajo aparece con el color de su tipo de unidad.
- Las salidas **a confirmar** van con borde punteado.
- Respeta el filtro de empresa de arriba.

---

## Guardias

Quién está de guardia cada día, por puesto: chofer de grúa, chofer de camión,
ayudante. Puede haber más de uno por puesto.

Se entra desde la tarjeta **Guardia de hoy** del tablero, o desde Maestros.

---

## Herramientas

Dónde está cada herramienta y quién la tiene.

### Cómo se lee el listado

Cada herramienta está **siempre en un solo lado**:

| Dice | Quiere decir |
|---|---|
| **En Base** (o cualquier lugar) | está guardada, disponible |
| **Tiene Gómez, Juan** | se la llevó alguien |
| **Arriba de GDU505** | vive en esa unidad |

Al lado va desde cuándo está ahí. Si hace mucho que no vuelve, se ve de una.

### Entregar

**Entregar** arriba a la derecha. Se elige a quién y se marcan las herramientas
—pueden ser varias de una—. Si la que entregás la tiene otra persona, el
sistema avisa, pero **deja guardar igual**: el cambio de manos queda en el
historial.

Si el destino es un **lugar**, se registra como devolución.

### La confirmación por WhatsApp

Cuando se la lleva una **persona**, al guardar sale un link. Se lo mandás por
WhatsApp y el empleado, desde el teléfono, ve qué le entregaron y confirma.
Puede dejar una nota («falta el cargador»).

**El link se muestra una sola vez**: si lo perdés, registrá la entrega de nuevo.

Hasta que la herramienta se confirme, figura como **sin confirmar** en el
listado y en el tablero. Una devolución al depósito no pide confirmación: un
lugar no acusa recibo.

### En las salidas de trabajo

Cada salida tiene su bloque **Herramientas de esta salida**. Desde ahí se
entregan y quedan enganchadas a ese trabajo, y **salen impresas en la hoja**
que firma el chofer.

La herramienta no «pertenece» a la salida: sigue estando donde esté hasta que
alguien la mueva. Si después se la lleva otro, el bloque de la salida lo dice.

### El historial

En la ficha de cada herramienta está todo: quién la tuvo, desde cuándo, con qué
salida salió y qué escribió el empleado al confirmar. No se edita.

---

## Maestros

Personal, equipos, empresas, clientes, lugares, guardias y —si sos
administrador— usuarios y el registro de cambios.

Dos cosas que conviene saber:

- Los **internos** se escriben `GDU` + tres dígitos. Si ponés `111`, el sistema
  lo guarda como `GDU111`.
- Los **teléfonos** se guardan como los necesita WhatsApp: `54` + `9` + área +
  número, por ejemplo `5491155782210`. Si cargás uno que no queda completo, la
  pantalla te lo pide de nuevo. **Es a propósito**: un teléfono mal cargado no
  se nota hasta que el mensaje no llega, y para entonces la salida ya se mandó.

---

## Registro de cambios

**Maestros → Registro de cambios**, solo administradores.

Cada vez que alguien da de alta, edita, borra o reabre algo, queda una línea con
quién fue, qué tocó y cuándo. Se filtra por tipo de cosa, acción, usuario y
rango de fechas, y los filtros aplican solos.

**Ver detalle** muestra campo por campo qué decía antes y qué dice ahora.

No se edita ni se borra: ese es el punto. Guardar sin cambiar nada no deja
línea.

---

## Los permisos

| Rol | Qué puede |
|---|---|
| **admin** | todo, incluidos usuarios, reabrir salidas y el registro de cambios |
| **operaciones** | cargar y editar salidas y livianos, y mover herramientas |
| **mantenimiento** | ver todo, marcar checklists como revisados y mover herramientas |
| **consulta** | ver, nada más |

Si intentás algo que tu rol no puede, aparece una pantalla que dice qué rol
tenés y cuál hace falta. No es una falla.

---

## Cuando algo no sale

| Qué ves | Qué pasa |
|---|---|
| «Esa unidad ya tiene ese numero de trabajo en esa fecha» | una unidad no puede tener dos veces el mismo número de trabajo en el día. Usá el 2, el 3 o el 4 |
| Un aviso de superposición | la persona o la unidad ya está asignada en un horario que se pisa. Revisá y, si está bien, **Guardar igual** |
| No podés editar una salida | está **finalizada**. La reabre un administrador |
| El teléfono no se guarda | le falta el área o el 9. Tiene que quedar `54` + `9` + área + número |
| El PDF tarda | está armando la hoja. El parte del día completo puede tardar unos segundos |
| Una pantalla vacía en un día que tuvo trabajo | fijate el filtro de empresa de arriba: puede estar en una sola |
| Perdiste el link de confirmación de una herramienta | registrá la entrega de nuevo: el link sale una sola vez y no se puede recuperar |
| «Este link no sirve» al confirmar | ya se usó, o está mal copiado. Pedí uno nuevo a la oficina |

Si algo se rompe de verdad, anotá **qué pantalla era, qué apretaste y a qué
hora**. Con eso se encuentra en el registro.

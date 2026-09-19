---
title: Central Operativa — Grupo Daniele
subtitle: De dos planillas de Excel a una central de operaciones
author: Propuesta comercial
date: Septiembre 2026
theme: claude-design
---

# Central Operativa

### Grupo Daniele

De dos planillas de Excel
a una central de operaciones

---

## Cómo se trabaja hoy

Dos archivos de Excel sostienen toda la operación:

- **GD 200 — Salida Operaciones**
  Los trabajos del día: una hoja por unidad, hasta 4 trabajos por unidad.

- **GD 208 — Control de Vehículos Livianos**
  Un libro por mes, una hoja por día, 13 vehículos.

> 38 unidades · 96 equipos · 55 personas · 10 empresas del grupo

---

## Lo que eso cuesta todos los días

| Lo que pasa | Lo que provoca |
|---|---|
| Un solo archivo, un solo editor por vez | Operaciones no puede cargar mientras otro imprime |
| La planilla se duplica todos los días | No hay historial ni forma de buscar |
| Nada valida superposiciones | Una persona o una grúa queda asignada dos veces |
| Se imprime y se reparte en papel | El chofer se entera tarde, o pierde la hoja |
| Los checklists llegan sueltos por WhatsApp | No hay resumen ni trazabilidad |
| No hay vista de semana ni de mes | La planificación se maneja de memoria |

---

## La propuesta

Una **aplicación web propia**, con la base de datos del Grupo Daniele,
que reemplaza los dos Excel y agrega lo que el Excel nunca pudo dar:

**Validación · Historial · Avisos automáticos · Trazabilidad**

Sin licencias por usuario. Sin depender de un proveedor externo.

---

# Qué hace la app

---

## 1 · Tablero del día

La pantalla donde arranca la mañana.

- Salidas del día, en ejecución, a confirmar
- Checklists recibidos sobre los esperados
- Vehículos livianos fuera de base
- Quién está de guardia hoy
- Un botón para imprimir el parte del día

Todo en una sola vista, actualizado solo.

---

## 2 · Salidas de trabajo

Reemplaza la hoja `Operacion` del GD 200.

- Alta, edición y listado por día, con historial completo
- Hasta 4 trabajos por unidad por día, como hoy
- **Numeración automática** `SAL-2026-0001`, sin repetidos
- **Avisa si una persona o una unidad ya está asignada** en ese horario
- Una salida finalizada queda cerrada: solo un admin la reabre, y queda registrado

---

## 3 · Los PDF de siempre

El papel no desaparece: mejora.

- **Salida individual** — una página A4 con el mismo formato que la hoja del Excel, con las tres firmas
- **Parte del día** — portada con el resumen y una hoja por salida
- **Livianos del día y del mes** — con totales por unidad

Se generan solos desde la pantalla, listos para imprimir o mandar.

---

## 4 · Vehículos livianos

Reemplaza el GD 208 completo.

- Grilla del día que se edita en línea, sin abrir ventanas
- Quién usó cada unidad, desde dónde, a qué hora, con qué motivo
- **Alerta cuando una unidad lleva más de 12 horas sin registrar el regreso**
- Exportación mensual a PDF

---

## 5 · Calendario de trabajos

Lo que el Excel nunca pudo mostrar.

- Vistas de **mes, semana y día**
- Color por tipo de unidad: grúas, camiones, autoelevadores
- Las salidas a confirmar se distinguen a simple vista
- Filtro por empresa del grupo

La planificación de la semana, de un vistazo.

---

## 6 · Checklists por WhatsApp

El chofer ya manda el checklist por WhatsApp. Ahora queda registrado.

- Ingreso automático desde el flujo de n8n
- Resumen del día: recibidos, con observación, pendientes
- El detalle con los ítems, el texto del chofer y las fotos
- Mantenimiento marca lo que ya revisó

---

## 7 · Envío por WhatsApp

Un botón y la salida le llega a toda la cuadrilla.

- Mensaje con unidad, horario, cliente, carga, descarga y observaciones
- Se puede adjuntar el PDF de la salida
- **Queda registrado quién lo recibió y quién lo leyó**
- Se avisa en pantalla si a alguien le falta el teléfono

---

## 8 · Maestros y permisos

- Personal, equipos, empresas, clientes y lugares, todos editables
- **Cuatro roles**: admin, operaciones, mantenimiento y consulta
- Cada usuario ve y hace solo lo que le corresponde
- **Toda modificación queda auditada**: quién, qué y cuándo

---

# Nuevo · Gestión de herramientas

### Dónde está cada cosa y quién la tiene

---

## El problema

Las herramientas se entregan y se pierde el rastro.

- No se sabe **dónde está** cada herramienta
- No se sabe **quién la tiene** ni desde cuándo
- Cuando falta algo, nadie se hace cargo
- El reclamo llega tarde, y sin respaldo

---

## Cómo lo resuelve

**Un inventario con estado y ubicación de cada herramienta.**

- Cada herramienta con su código, estado y dónde está
- Se asigna a una persona, a una unidad o a una obra
- Historial completo: quién la tuvo, cuándo y por cuánto tiempo
- Alertas de herramientas sin devolver

---

## La confirmación por WhatsApp

Lo que cierra el círculo.

1. El jefe **entrega** una herramienta y la asigna en el sistema
2. Al empleado le llega un **formulario a su WhatsApp**
3. El empleado **confirma que la recibió**, desde el teléfono
4. La confirmación queda guardada, con fecha y hora

> Si no confirma, la herramienta figura como **entrega sin confirmar**.

---

## Por qué importa

**La responsabilidad queda documentada.**

- No es la palabra de uno contra la del otro: hay un registro con fecha y hora
- El empleado sabe qué tiene a cargo
- Al devolver, se cierra el ciclo con el mismo mecanismo
- Se reduce la pérdida de herramientas, que hoy nadie mide

Usa el **mismo canal de WhatsApp** que ya funciona para los checklists.

---

# Cómo está armado

---

## La tecnología

| Capa | Elección | Por qué |
|---|---|---|
| Aplicación | Next.js + TypeScript | Un solo proyecto, un solo despliegue |
| Base de datos | PostgreSQL | El mismo motor que ya usa la empresa |
| WhatsApp | n8n + Meta Cloud API | Reutiliza el flujo que ya funciona |
| PDF | Generados por la misma app | El papel sale igual a la pantalla |
| Servidor | VPS propio | Sin costo por usuario |

---

## Lo que ya está funcionando

- Los maestros importados de los Excel: **10 empresas, 55 personas, 96 equipos, 7 lugares**
- Salidas de trabajo con validaciones y PDF
- Vehículos livianos con alertas
- Calendario de mes, semana y día
- Checklists y guardias
- Usuarios, roles y auditoría

**La app está desplegada y en uso.**

---

## Lo que sigue

1. **Envío por WhatsApp** de las salidas — falta la plantilla aprobada por Meta
2. **Gestión de herramientas** con confirmación por WhatsApp
3. Acompañamiento en paralelo con el Excel, una semana, antes de apagarlo

---

## Lo que hace falta de la empresa

| Qué | Para qué | Estado |
|---|---|---|
| Teléfonos del personal | Sin eso no hay WhatsApp | **Pendiente** |
| Plantilla aprobada por Meta | Para iniciar conversación | **Pendiente** |
| Definir cliente y OT | Si salen de Odoo o de la central | **Pendiente** |
| Listado de herramientas | Para arrancar el inventario | **Pendiente** |

---

# Central Operativa

### Una sola pantalla,
### toda la operación del día

**El Excel se apaga. El historial queda.**

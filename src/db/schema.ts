/**
 * Central Operativa — Gruas Daniele
 * Esquema de base de datos. Única fuente de verdad.
 * Corresponde al capítulo 4 de docs/spec.md.
 */
import {
  pgTable, pgEnum, serial, bigserial, smallint, integer, text, boolean,
  numeric, date, time, timestamp, jsonb, unique, index, check, primaryKey,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

/* ══════════════════════════ ENUMS ══════════════════════════ */

export const estadoSalidaEnum = pgEnum('estado_salida', [
  'a_confirmar', 'en_ejecucion', 'finalizado', 'anulado',
])

export const gestionSalidaEnum = pgEnum('gestion_salida', [
  'permiso_corte', 'traslado_carreton', 'otros',
])

export const rolSalidaEnum = pgEnum('rol_salida', [
  'chofer', 'operador_grua', 'jefe_cuadrilla', 'ayudante', 'acompanante',
])

export const estadoLivianoEnum = pgEnum('estado_liviano', [
  'en_base', 'en_uso', 'taller', 'no_disponible',
])

export const resultadoChecklistEnum = pgEnum('resultado_checklist', [
  'sin_novedad', 'con_observacion', 'pendiente',
])

export const rolUsuarioEnum = pgEnum('rol_usuario', [
  'admin', 'operaciones', 'mantenimiento', 'consulta',
])

/* ══════════════════════════ MAESTROS ══════════════════════════ */

export const empresas = pgTable('empresas', {
  id: serial('id').primaryKey(),
  codigo: text('codigo').notNull().unique(),          // GD01, GD02...
  razonSocial: text('razon_social').notNull(),        // "West Group SH"
  nombreCorto: text('nombre_corto').notNull(),        // "West Group"
  cuit: text('cuit').unique(),
  activa: boolean('activa').notNull().default(true),
})

export const personal = pgTable('personal', {
  id: serial('id').primaryKey(),
  apellidoNombre: text('apellido_nombre').notNull(),
  legajo: text('legajo'),                             // GDL001 — puede repetirse, ver spec cap. 5
  documento: text('documento').unique(),
  empresaId: integer('empresa_id').references(() => empresas.id),
  puesto: text('puesto'),                             // "Operador de Grua 25/50 TN"
  telefonoWsp: text('telefono_wsp'),                  // E.164 sin "+": 5491155782210
  esChofer: boolean('es_chofer').notNull().default(false),
  esVerificador: boolean('es_verificador').notNull().default(false),
  esOperador: boolean('es_operador').notNull().default(false),
  activo: boolean('activo').notNull().default(true),
}, (t) => [
  index('personal_activo_nombre_idx').on(t.activo, t.apellidoNombre),
])

export const equipos = pgTable('equipos', {
  id: serial('id').primaryKey(),
  interno: text('interno').notNull().unique(),        // GDU505
  nroViejo: text('nro_viejo'),
  tipo: text('tipo').notNull(),                       // Liviano | Camion | Grua | ...
  tns: numeric('tns'),
  marca: text('marca'),
  modelo: text('modelo'),
  patente: text('patente'),
  equipoAsignado: text('equipo_asignado'),            // GDU600 — auxiliar habitual
  activo: boolean('activo').notNull().default(true),
}, (t) => [
  index('equipos_tipo_idx').on(t.tipo, t.activo),
])

export const clientes = pgTable('clientes', {
  id: serial('id').primaryKey(),
  razonSocial: text('razon_social').notNull(),
  cuit: text('cuit'),
  odooId: integer('odoo_id'),
  activo: boolean('activo').notNull().default(true),
}, (t) => [
  unique('clientes_razon_social_unq').on(t.razonSocial),
])

export const lugares = pgTable('lugares', {
  id: serial('id').primaryKey(),
  codigo: text('codigo').notNull().unique(),
  nombre: text('nombre').notNull(),
})

/* ══════════════════════════ USUARIOS ══════════════════════════ */

export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  personalId: integer('personal_id').references(() => personal.id),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  rol: rolUsuarioEnum('rol').notNull().default('consulta'),
  activo: boolean('activo').notNull().default(true),
})

/* ══════════════════════════ SALIDAS DE TRABAJO ══════════════════════════ */

export const salidas = pgTable('salidas', {
  id: serial('id').primaryKey(),
  numero: text('numero').notNull().unique(),          // SAL-2026-0873
  fecha: date('fecha').notNull(),
  ordenDia: smallint('orden_dia').notNull(),          // 1..4 (Trabajo 1 a 4 del Excel)
  equipoId: integer('equipo_id').notNull().references(() => equipos.id),
  equipoAuxId: integer('equipo_aux_id').references(() => equipos.id),
  empresaId: integer('empresa_id').notNull().references(() => empresas.id),
  clienteId: integer('cliente_id').references(() => clientes.id),
  ot: text('ot'),
  remito: text('remito'),
  horaSalida: time('hora_salida'),
  lugarCarga: text('lugar_carga'),
  contactoCarga: text('contacto_carga'),
  telefonoCarga: text('telefono_carga'),
  lugarDescarga: text('lugar_descarga'),
  contactoDescarga: text('contacto_descarga'),
  telefonoDescarga: text('telefono_descarga'),
  verificadorId: integer('verificador_id').references(() => personal.id),
  operadorId: integer('operador_id').references(() => personal.id),
  gestion: gestionSalidaEnum('gestion'),
  estado: estadoSalidaEnum('estado').notNull().default('a_confirmar'),
  observaciones: text('observaciones'),
  creadoPor: integer('creado_por').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('salidas_fecha_equipo_orden_unq').on(t.fecha, t.equipoId, t.ordenDia),
  check('salidas_orden_dia_check', sql`${t.ordenDia} BETWEEN 1 AND 4`),
  index('salidas_fecha_hora_idx').on(t.fecha, t.horaSalida),
  index('salidas_estado_idx').on(t.estado),
])

export const salidaPersonal = pgTable('salida_personal', {
  salidaId: integer('salida_id').notNull()
    .references(() => salidas.id, { onDelete: 'cascade' }),
  personalId: integer('personal_id').notNull().references(() => personal.id),
  rol: rolSalidaEnum('rol').notNull(),
  esSuplente: boolean('es_suplente').notNull().default(false),
}, (t) => [
  primaryKey({ columns: [t.salidaId, t.personalId] }),
])

export const salidaEnvios = pgTable('salida_envios', {
  id: serial('id').primaryKey(),
  salidaId: integer('salida_id').notNull()
    .references(() => salidas.id, { onDelete: 'cascade' }),
  personalId: integer('personal_id').references(() => personal.id),
  telefono: text('telefono').notNull(),
  plantilla: text('plantilla').notNull(),             // salida_trabajo_v1
  wamid: text('wamid'),                               // id del mensaje de Meta
  estado: text('estado').notNull(),                   // enviado|entregado|leido|error
  errorDetalle: text('error_detalle'),
  enviadoAt: timestamp('enviado_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('salida_envios_wamid_idx').on(t.wamid),
])

/* ══════════════════════════ VEHICULOS LIVIANOS ══════════════════════════ */

export const usoLivianos = pgTable('uso_livianos', {
  id: serial('id').primaryKey(),
  fecha: date('fecha').notNull(),
  equipoId: integer('equipo_id').notNull().references(() => equipos.id),
  personalId: integer('personal_id').references(() => personal.id),
  lugarSalida: text('lugar_salida'),
  horaSalida: time('hora_salida'),
  lugarLlegada: text('lugar_llegada'),
  horaLlegada: time('hora_llegada'),
  uso: text('uso'),
  observaciones: text('observaciones'),
  estado: estadoLivianoEnum('estado').notNull().default('en_base'),
  registradoPor: integer('registrado_por').references(() => usuarios.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('uso_livianos_fecha_equipo_idx').on(t.fecha, t.equipoId),
])

/* ══════════════════════════ CHECKLISTS ══════════════════════════ */

export const checklists = pgTable('checklists', {
  id: serial('id').primaryKey(),
  fecha: date('fecha').notNull(),
  equipoId: integer('equipo_id').references(() => equipos.id),
  personalId: integer('personal_id').references(() => personal.id),
  telefono: text('telefono'),
  resultado: resultadoChecklistEnum('resultado').notNull().default('pendiente'),
  observaciones: text('observaciones'),
  recibidoAt: timestamp('recibido_at', { withTimezone: true }),
  revisadoPor: integer('revisado_por').references(() => usuarios.id),
  revisadoAt: timestamp('revisado_at', { withTimezone: true }),
  payload: jsonb('payload'),                          // lo que manda n8n, tal cual
}, (t) => [
  unique('checklists_fecha_equipo_unq').on(t.fecha, t.equipoId),
])

export const checklistItems = pgTable('checklist_items', {
  id: serial('id').primaryKey(),
  checklistId: integer('checklist_id').notNull()
    .references(() => checklists.id, { onDelete: 'cascade' }),
  item: text('item').notNull(),                       // "Neumáticos"
  ok: boolean('ok'),
  comentario: text('comentario'),
})

export const checklistAdjuntos = pgTable('checklist_adjuntos', {
  id: serial('id').primaryKey(),
  checklistId: integer('checklist_id').notNull()
    .references(() => checklists.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  tipo: text('tipo'),
})

/* ══════════════════════════ GUARDIAS Y AUDITORIA ══════════════════════════ */

export const guardias = pgTable('guardias', {
  id: serial('id').primaryKey(),
  fecha: date('fecha').notNull(),
  rol: text('rol').notNull(),                         // chofer_grua|chofer_camion|ayudante
  personalId: integer('personal_id').notNull().references(() => personal.id),
}, (t) => [
  unique('guardias_fecha_rol_personal_unq').on(t.fecha, t.rol, t.personalId),
])

export const auditoria = pgTable('auditoria', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  usuarioId: integer('usuario_id').references(() => usuarios.id),
  entidad: text('entidad').notNull(),
  entidadId: integer('entidad_id'),
  accion: text('accion').notNull(),
  antes: jsonb('antes'),
  despues: jsonb('despues'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('auditoria_entidad_idx').on(t.entidad, t.entidadId),
])

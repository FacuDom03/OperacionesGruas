import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import {
  equipos, herramientaEntregas, herramientaMovimientos, herramientas, lugares, personal, salidas,
} from '@/db/schema'

/**
 * Capitulo 14 del spec. El dato de fondo es la custodia: quien o que tiene la
 * herramienta ahora. Todo lo demas se deriva de ahi.
 */

/** Donde esta una herramienta, ya resuelto a algo que se pueda mostrar. */
export type Custodia = {
  tipo: 'persona' | 'unidad' | 'lugar'
  nombre: string
  /** A donde lleva el nombre, si tiene ficha propia. */
  enlace: string | null
}

export function custodiaDe(fila: {
  personaNombre: string | null
  personaId: number | null
  unidadInterno: string | null
  unidadId: number | null
  lugarNombre: string | null
}): Custodia {
  if (fila.personaNombre) {
    return { tipo: 'persona', nombre: fila.personaNombre, enlace: `/maestros/personal/${fila.personaId}` }
  }
  if (fila.unidadInterno) {
    return { tipo: 'unidad', nombre: fila.unidadInterno, enlace: `/maestros/equipos/${fila.unidadId}` }
  }
  return { tipo: 'lugar', nombre: fila.lugarNombre ?? '—', enlace: null }
}

/** Una custodia lista para guardar: exactamente una de las tres. */
export type Destino =
  | { tipo: 'persona'; id: number }
  | { tipo: 'unidad'; id: number }
  | { tipo: 'lugar'; id: number }

export function columnasDeDestino(destino: Destino) {
  return {
    personalId: destino.tipo === 'persona' ? destino.id : null,
    equipoId: destino.tipo === 'unidad' ? destino.id : null,
    lugarId: destino.tipo === 'lugar' ? destino.id : null,
  }
}

/** "persona:12" ⇄ { tipo: 'persona', id: 12 }. Es lo que viaja en el <select>. */
export function leerDestino(valor: string | null | undefined): Destino | null {
  if (!valor) return null
  const [tipo, id] = valor.split(':')
  const numero = Number(id)
  if (!Number.isInteger(numero) || numero <= 0) return null
  if (tipo === 'persona' || tipo === 'unidad' || tipo === 'lugar') return { tipo, id: numero }
  return null
}

export function escribirDestino(destino: Destino): string {
  return `${destino.tipo}:${destino.id}`
}

/* ── Consultas ──────────────────────────────────────────────────────── */

const SELECCION = {
  id: herramientas.id,
  codigo: herramientas.codigo,
  nombre: herramientas.nombre,
  tipo: herramientas.tipo,
  marca: herramientas.marca,
  modelo: herramientas.modelo,
  numeroSerie: herramientas.numeroSerie,
  estado: herramientas.estado,
  observaciones: herramientas.observaciones,
  empresaId: herramientas.empresaId,
  custodiaDesde: herramientas.custodiaDesde,
  personaId: herramientas.custodiaPersonalId,
  personaNombre: personal.apellidoNombre,
  personaTelefono: personal.telefonoWsp,
  unidadId: herramientas.custodiaEquipoId,
  unidadInterno: equipos.interno,
  lugarId: herramientas.custodiaLugarId,
  lugarNombre: lugares.nombre,
  entregaId: herramientas.custodiaEntregaId,
  confirmadoAt: herramientaEntregas.confirmadoAt,
  // Se pidio confirmacion si se genero un link. Una devolucion a un lugar no
  // genera ninguno: un deposito no acusa recibo.
  pideConfirmacion: sql<boolean>`${herramientaEntregas.tokenHash} is not null`,
}

function conJoins() {
  return db
    .select(SELECCION)
    .from(herramientas)
    .leftJoin(personal, eq(herramientas.custodiaPersonalId, personal.id))
    .leftJoin(equipos, eq(herramientas.custodiaEquipoId, equipos.id))
    .leftJoin(lugares, eq(herramientas.custodiaLugarId, lugares.id))
    .leftJoin(herramientaEntregas, eq(herramientas.custodiaEntregaId, herramientaEntregas.id))
}

export type FiltroHerramientas = {
  texto?: string
  estado?: string
  donde?: 'persona' | 'unidad' | 'lugar'
  /** Solo las entregadas que todavia nadie confirmo. */
  sinConfirmar?: boolean
}

export async function listadoDeHerramientas(filtro: FiltroHerramientas) {
  const partes: SQL[] = []

  if (filtro.texto) {
    const patron = `%${filtro.texto}%`
    const busqueda = or(
      ilike(herramientas.codigo, patron),
      ilike(herramientas.nombre, patron),
      ilike(herramientas.marca, patron),
      ilike(herramientas.modelo, patron),
      ilike(herramientas.numeroSerie, patron),
      ilike(personal.apellidoNombre, patron),
      ilike(equipos.interno, patron),
    )
    if (busqueda) partes.push(busqueda)
  }

  if (filtro.estado === 'activa' || filtro.estado === 'en_reparacion'
    || filtro.estado === 'perdida' || filtro.estado === 'baja') {
    partes.push(eq(herramientas.estado, filtro.estado))
  }

  if (filtro.donde === 'persona') partes.push(isNotNull(herramientas.custodiaPersonalId))
  if (filtro.donde === 'unidad') partes.push(isNotNull(herramientas.custodiaEquipoId))
  if (filtro.donde === 'lugar') partes.push(isNotNull(herramientas.custodiaLugarId))

  // Sin confirmar solo tiene sentido si se pidio confirmacion.
  if (filtro.sinConfirmar) {
    partes.push(isNotNull(herramientaEntregas.tokenHash))
    partes.push(isNull(herramientaEntregas.confirmadoAt))
  }

  return conJoins()
    .where(partes.length ? and(...partes) : undefined)
    .orderBy(asc(herramientas.codigo))
}

export async function herramienta(id: number) {
  const [fila] = await conJoins().where(eq(herramientas.id, id)).limit(1)
  return fila ?? null
}

/** El historial completo de una herramienta, del ultimo movimiento al primero. */
export async function historialDeHerramienta(id: number) {
  // Alias de verdad: las mismas tablas entran dos veces en la consulta, una
  // por el destino de la entrega y otra por el origen del movimiento.
  const desdePersonal = alias(personal, 'desde_personal')
  const desdeEquipo = alias(equipos, 'desde_equipo')
  const desdeLugar = alias(lugares, 'desde_lugar')

  return db
    .select({
      id: herramientaMovimientos.id,
      tipo: herramientaEntregas.tipo,
      cuando: herramientaEntregas.createdAt,
      observaciones: herramientaEntregas.observaciones,
      confirmadoAt: herramientaEntregas.confirmadoAt,
      confirmadoNota: herramientaEntregas.confirmadoNota,
      salidaId: herramientaEntregas.salidaId,
      salidaNumero: salidas.numero,
      haciaPersona: personal.apellidoNombre,
      haciaUnidad: equipos.interno,
      haciaLugar: lugares.nombre,
      desdePersona: desdePersonal.apellidoNombre,
      desdeUnidad: desdeEquipo.interno,
      desdeLugar: desdeLugar.nombre,
    })
    .from(herramientaMovimientos)
    .innerJoin(herramientaEntregas, eq(herramientaMovimientos.entregaId, herramientaEntregas.id))
    .leftJoin(personal, eq(herramientaEntregas.haciaPersonalId, personal.id))
    .leftJoin(equipos, eq(herramientaEntregas.haciaEquipoId, equipos.id))
    .leftJoin(lugares, eq(herramientaEntregas.haciaLugarId, lugares.id))
    .leftJoin(desdePersonal, eq(herramientaMovimientos.desdePersonalId, desdePersonal.id))
    .leftJoin(desdeEquipo, eq(herramientaMovimientos.desdeEquipoId, desdeEquipo.id))
    .leftJoin(desdeLugar, eq(herramientaMovimientos.desdeLugarId, desdeLugar.id))
    .leftJoin(salidas, eq(herramientaEntregas.salidaId, salidas.id))
    .where(eq(herramientaMovimientos.herramientaId, id))
    .orderBy(desc(herramientaEntregas.createdAt), desc(herramientaMovimientos.id))
}

/** Las herramientas de una entrega, para el formulario de confirmacion. */
export async function herramientasDeEntrega(entregaId: number) {
  return db
    .select({
      codigo: herramientas.codigo,
      nombre: herramientas.nombre,
      marca: herramientas.marca,
      modelo: herramientas.modelo,
      numeroSerie: herramientas.numeroSerie,
    })
    .from(herramientaMovimientos)
    .innerJoin(herramientas, eq(herramientaMovimientos.herramientaId, herramientas.id))
    .where(eq(herramientaMovimientos.entregaId, entregaId))
    .orderBy(asc(herramientas.codigo))
}

/** Las que puede llevar una entrega: ni de baja ni perdidas. */
export async function herramientasQueSePuedenMover() {
  return conJoins()
    .where(inArray(herramientas.estado, ['activa', 'en_reparacion']))
    .orderBy(asc(herramientas.codigo))
}

/** Las que tiene una persona o una unidad ahora. Para la devolucion. */
export async function herramientasEnPoderDe(destino: Destino) {
  const columna = destino.tipo === 'persona' ? herramientas.custodiaPersonalId
    : destino.tipo === 'unidad' ? herramientas.custodiaEquipoId
      : herramientas.custodiaLugarId
  return conJoins().where(eq(columna, destino.id)).orderBy(asc(herramientas.codigo))
}

/** Cuantos dias hace que una herramienta esta donde esta. */
export function diasEnCustodia(desde: Date | null): number {
  if (!desde) return 0
  return Math.floor((Date.now() - desde.getTime()) / 86_400_000)
}

/** Lo que va en la tarjeta del tablero. */
export async function alertasDeHerramientas() {
  const [fila] = await db
    .select({
      enPersonas: sql<number>`count(*) filter (where ${herramientas.custodiaPersonalId} is not null)`,
      sinConfirmar: sql<number>`count(*) filter (
        where ${herramientaEntregas.tokenHash} is not null
          and ${herramientaEntregas.confirmadoAt} is null
      )`,
      hace30Dias: sql<number>`count(*) filter (
        where ${herramientas.custodiaPersonalId} is not null
          and ${herramientas.custodiaDesde} < now() - interval '30 days'
      )`,
    })
    .from(herramientas)
    .leftJoin(herramientaEntregas, eq(herramientas.custodiaEntregaId, herramientaEntregas.id))
    .where(inArray(herramientas.estado, ['activa', 'en_reparacion']))

  return {
    enPersonas: Number(fila?.enPersonas ?? 0),
    sinConfirmar: Number(fila?.sinConfirmar ?? 0),
    hace30Dias: Number(fila?.hace30Dias ?? 0),
  }
}

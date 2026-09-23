import { and, count, desc, eq, exists, gte, ilike, inArray, lte, or, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, empresas, equipos, personal, salidaPersonal, salidas } from '@/db/schema'

/**
 * Busqueda de salidas por fuera del dia.
 *
 * El listado de /salidas es por dia, que es como se trabaja a la mañana. Pero
 * para encontrar un trabajo viejo —"el de Techint de septiembre", "la salida
 * 873"— hace falta buscar sin saber la fecha. Era lo que el capitulo 1 del spec
 * le reprochaba al Excel y la app todavia no daba.
 */

export const POR_PAGINA = 50

export type FiltroBusqueda = {
  texto?: string
  desde?: string
  hasta?: string
  estado?: string
  /** Las empresas elegidas en la cabecera, si hay alguna. */
  empresas?: number[] | null
}

const ESTADOS = ['a_confirmar', 'en_ejecucion', 'finalizado', 'anulado'] as const
type Estado = (typeof ESTADOS)[number]

function condiciones(filtro: FiltroBusqueda): SQL | undefined {
  const partes: SQL[] = []

  if (filtro.texto) {
    const patron = `%${filtro.texto}%`
    const busqueda = or(
      ilike(salidas.numero, patron),
      ilike(salidas.ot, patron),
      ilike(salidas.remito, patron),
      ilike(salidas.lugarCarga, patron),
      ilike(salidas.lugarDescarga, patron),
      ilike(salidas.observaciones, patron),
      ilike(clientes.razonSocial, patron),
      ilike(equipos.interno, patron),
      ilike(equipos.patente, patron),
      ilike(empresas.nombreCorto, patron),
      // Tambien por quien fue: "todas las de Gomez" es una pregunta habitual.
      exists(
        db
          .select({ uno: salidaPersonal.personalId })
          .from(salidaPersonal)
          .innerJoin(personal, eq(salidaPersonal.personalId, personal.id))
          .where(and(eq(salidaPersonal.salidaId, salidas.id), ilike(personal.apellidoNombre, patron))),
      ),
    )
    if (busqueda) partes.push(busqueda)
  }

  if (filtro.desde) partes.push(gte(salidas.fecha, filtro.desde))
  if (filtro.hasta) partes.push(lte(salidas.fecha, filtro.hasta))

  if (filtro.estado && (ESTADOS as readonly string[]).includes(filtro.estado)) {
    partes.push(eq(salidas.estado, filtro.estado as Estado))
  }

  if (filtro.empresas && filtro.empresas.length > 0) {
    partes.push(inArray(salidas.empresaId, filtro.empresas))
  }

  return partes.length ? and(...partes) : undefined
}

export async function buscarSalidas(filtro: FiltroBusqueda, pagina: number) {
  const donde = condiciones(filtro)

  const consulta = db
    .select({
      id: salidas.id,
      numero: salidas.numero,
      fecha: salidas.fecha,
      ordenDia: salidas.ordenDia,
      horaSalida: salidas.horaSalida,
      estado: salidas.estado,
      ot: salidas.ot,
      remito: salidas.remito,
      lugarCarga: salidas.lugarCarga,
      lugarDescarga: salidas.lugarDescarga,
      cliente: clientes.razonSocial,
      interno: equipos.interno,
      marca: equipos.marca,
      modelo: equipos.modelo,
      empresa: empresas.nombreCorto,
    })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .leftJoin(clientes, eq(salidas.clienteId, clientes.id))

  const conteo = db
    .select({ total: count() })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .leftJoin(clientes, eq(salidas.clienteId, clientes.id))

  const [filas, [{ total }]] = await Promise.all([
    consulta
      .where(donde)
      // De la mas nueva a la mas vieja: lo que se busca suele ser reciente.
      .orderBy(desc(salidas.fecha), desc(salidas.horaSalida), desc(salidas.id))
      .limit(POR_PAGINA)
      .offset((pagina - 1) * POR_PAGINA),
    conteo.where(donde),
  ])

  return { filas, total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) }
}

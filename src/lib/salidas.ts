import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { personal, salidaPersonal, salidas } from '@/db/schema'
import { formatearHora } from '@/lib/formato'

/**
 * Numero de salida: SAL-<anio>-<secuencia>, generado por la secuencia de
 * Postgres que crea drizzle/0001. El usuario nunca lo escribe.
 */
export async function proximoNumero(fecha: string): Promise<string> {
  const filas = await db.execute<{ numero: string }>(sql`
    select 'SAL-' || to_char(${fecha}::date, 'YYYY') || '-' ||
           lpad(nextval('salidas_numero_seq')::text, 4, '0') as numero
  `)
  return filas[0].numero
}

/**
 * Cuanto se tienen que acercar dos salidas para considerarlas superpuestas.
 *
 * El modelo tiene hora de salida pero no de regreso: el Excel nunca la tuvo, asi
 * que no hay forma de saber cuando termina un trabajo. Mientras no exista ese
 * dato, se avisa cuando dos salidas arrancan con menos de estas horas de
 * diferencia. No bloquea nada: es un aviso, como pide el spec.
 */
const MARGEN_HORAS = 2

function seSuperponen(unaHora: string | null, otraHora: string | null): boolean {
  // Sin hora cargada no se puede descartar el cruce, asi que se avisa igual.
  if (!unaHora || !otraHora) return true

  const minutos = (h: string) => {
    const [hora, min] = h.split(':')
    return Number(hora) * 60 + Number(min)
  }

  return Math.abs(minutos(unaHora) - minutos(otraHora)) < MARGEN_HORAS * 60
}

/**
 * Avisos de solapamiento de unidad y de personal, para el mismo dia.
 * Devuelve textos listos para mostrar. Nunca impide guardar (reglas 2 y 3 del
 * capitulo 4 del spec): hoy el Excel no avisa nada, y a veces el cruce es real
 * y esta decidido.
 */
export async function avisosDeSolapamiento(datos: {
  salidaId: number | null
  fecha: string
  equipoId: number
  horaSalida: string | null
  personalIds: number[]
}): Promise<string[]> {
  const otras = await db
    .select({
      id: salidas.id,
      numero: salidas.numero,
      horaSalida: salidas.horaSalida,
      equipoId: salidas.equipoId,
    })
    .from(salidas)
    .where(
      and(
        eq(salidas.fecha, datos.fecha),
        ne(salidas.estado, 'anulado'),
        datos.salidaId ? ne(salidas.id, datos.salidaId) : undefined,
      ),
    )

  if (otras.length === 0) return []

  const avisos: string[] = []

  // La misma unidad puede tener hasta 4 trabajos en el dia: eso es normal. Lo
  // que se avisa es que dos de esos trabajos salgan casi a la misma hora.
  for (const otra of otras) {
    if (otra.equipoId === datos.equipoId && seSuperponen(datos.horaSalida, otra.horaSalida)) {
      avisos.push(
        `La unidad ya sale en ${otra.numero}${otra.horaSalida ? ` a las ${formatearHora(otra.horaSalida)}` : ' (sin hora cargada)'}.`,
      )
    }
  }

  if (datos.personalIds.length > 0) {
    const asignados = await db
      .select({
        salidaId: salidaPersonal.salidaId,
        personalId: salidaPersonal.personalId,
        nombre: personal.apellidoNombre,
      })
      .from(salidaPersonal)
      .innerJoin(personal, eq(salidaPersonal.personalId, personal.id))
      .where(
        and(
          inArray(salidaPersonal.salidaId, otras.map((o) => o.id)),
          inArray(salidaPersonal.personalId, datos.personalIds),
        ),
      )

    for (const asignado of asignados) {
      const otra = otras.find((o) => o.id === asignado.salidaId)!
      if (!seSuperponen(datos.horaSalida, otra.horaSalida)) continue
      avisos.push(
        `${asignado.nombre} ya esta en ${otra.numero}${otra.horaSalida ? ` a las ${formatearHora(otra.horaSalida)}` : ' (sin hora cargada)'}.`,
      )
    }
  }

  return avisos
}

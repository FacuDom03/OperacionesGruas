import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '@/db'
import { equipos, personal, usoLivianos } from '@/db/schema'

/** Los movimientos de un dia, con la unidad y la persona ya resueltas. */
export function movimientosDelDia(fecha: string) {
  return db
    .select({
      id: usoLivianos.id,
      fecha: usoLivianos.fecha,
      interno: equipos.interno,
      patente: equipos.patente,
      persona: personal.apellidoNombre,
      lugarSalida: usoLivianos.lugarSalida,
      horaSalida: usoLivianos.horaSalida,
      lugarLlegada: usoLivianos.lugarLlegada,
      horaLlegada: usoLivianos.horaLlegada,
      uso: usoLivianos.uso,
      observaciones: usoLivianos.observaciones,
      estado: usoLivianos.estado,
    })
    .from(usoLivianos)
    .innerJoin(equipos, eq(usoLivianos.equipoId, equipos.id))
    .leftJoin(personal, eq(usoLivianos.personalId, personal.id))
    .where(eq(usoLivianos.fecha, fecha))
    .orderBy(asc(equipos.interno), asc(usoLivianos.horaSalida))
}

/** Idem para un mes entero: 'aaaa-mm' -> del 01 al ultimo dia. */
export function movimientosDelMes(mes: string) {
  const [anio, numeroMes] = mes.split('-').map(Number)
  const ultimoDia = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate()

  return db
    .select({
      id: usoLivianos.id,
      fecha: usoLivianos.fecha,
      interno: equipos.interno,
      patente: equipos.patente,
      persona: personal.apellidoNombre,
      lugarSalida: usoLivianos.lugarSalida,
      horaSalida: usoLivianos.horaSalida,
      lugarLlegada: usoLivianos.lugarLlegada,
      horaLlegada: usoLivianos.horaLlegada,
      uso: usoLivianos.uso,
      observaciones: usoLivianos.observaciones,
      estado: usoLivianos.estado,
    })
    .from(usoLivianos)
    .innerJoin(equipos, eq(usoLivianos.equipoId, equipos.id))
    .leftJoin(personal, eq(usoLivianos.personalId, personal.id))
    .where(
      and(
        gte(usoLivianos.fecha, `${mes}-01`),
        lte(usoLivianos.fecha, `${mes}-${String(ultimoDia).padStart(2, '0')}`),
      ),
    )
    .orderBy(asc(usoLivianos.fecha), asc(equipos.interno), asc(usoLivianos.horaSalida))
}

export type MovimientoLiviano = Awaited<ReturnType<typeof movimientosDelDia>>[number]

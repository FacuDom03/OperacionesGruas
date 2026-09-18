import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { guardias, personal } from '@/db/schema'

/**
 * Puestos de guardia. El campo `rol` de la tabla es texto libre, pero la
 * pantalla trabaja con esta lista fija: son los puestos que usa la hoja
 * GUARDIAS del GD 200. Puede haber más de una persona en el mismo puesto (dos
 * ayudantes, por ejemplo): el UNIQUE de la tabla es (fecha, rol, persona).
 */
export const PUESTOS = [
  { rol: 'chofer_grua', texto: 'Chofer grúa' },
  { rol: 'chofer_camion', texto: 'Chofer camión' },
  { rol: 'ayudante', texto: 'Ayudante' },
] as const

export function nombreDePuesto(rol: string): string {
  return PUESTOS.find((p) => p.rol === rol)?.texto ?? rol
}

/** La guardia de un día, con los nombres resueltos y ordenada por puesto. */
export async function guardiaDelDia(fecha: string) {
  const filas = await db
    .select({
      id: guardias.id,
      rol: guardias.rol,
      personalId: guardias.personalId,
      nombre: personal.apellidoNombre,
      telefono: personal.telefonoWsp,
    })
    .from(guardias)
    .innerJoin(personal, eq(guardias.personalId, personal.id))
    .where(eq(guardias.fecha, fecha))
    .orderBy(asc(guardias.rol), asc(personal.apellidoNombre))

  const orden = PUESTOS.map((p) => p.rol) as readonly string[]
  return filas.sort((a, b) => orden.indexOf(a.rol) - orden.indexOf(b.rol))
}

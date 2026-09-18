import { and, asc, eq, inArray, ne } from 'drizzle-orm'
import { db } from '@/db'
import { checklistAdjuntos, checklistItems, checklists, equipos, personal, salidas } from '@/db/schema'

/**
 * El resumen de un día: lo que llegó, y lo que se esperaba y no llegó.
 *
 * Los pendientes se calculan en el momento, en vez de crearlos de madrugada con
 * un cron como decía el capítulo 9. Sale lo mismo en pantalla ("14 de 17") y no
 * depende de que el cron haya corrido: si una salida se carga a media mañana,
 * su unidad aparece igual como pendiente.
 */
export async function resumenDelDia(fecha: string) {
  const recibidos = await db
    .select({
      id: checklists.id,
      resultado: checklists.resultado,
      observaciones: checklists.observaciones,
      recibidoAt: checklists.recibidoAt,
      revisadoAt: checklists.revisadoAt,
      telefono: checklists.telefono,
      equipoId: checklists.equipoId,
      interno: equipos.interno,
      marca: equipos.marca,
      modelo: equipos.modelo,
      persona: personal.apellidoNombre,
    })
    .from(checklists)
    .innerJoin(equipos, eq(checklists.equipoId, equipos.id))
    .leftJoin(personal, eq(checklists.personalId, personal.id))
    .where(eq(checklists.fecha, fecha))
    .orderBy(asc(checklists.recibidoAt))

  // Unidades con salida ese día: de esas se espera checklist.
  const conSalida = await db
    .selectDistinct({ equipoId: salidas.equipoId, interno: equipos.interno, marca: equipos.marca, modelo: equipos.modelo })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .where(and(eq(salidas.fecha, fecha), ne(salidas.estado, 'anulado')))
    .orderBy(asc(equipos.interno))

  const llegaron = new Set(recibidos.map((r) => r.equipoId))
  const pendientes = conSalida.filter((u) => !llegaron.has(u.equipoId))

  return {
    recibidos,
    pendientes,
    esperados: conSalida.length,
    sinNovedad: recibidos.filter((r) => r.resultado === 'sin_novedad').length,
    conObservacion: recibidos.filter((r) => r.resultado === 'con_observacion').length,
  }
}

/** El detalle de un checklist: sus ítems y sus fotos. */
export async function detalleDeChecklist(id: number) {
  const [cabecera] = await db
    .select({
      id: checklists.id,
      fecha: checklists.fecha,
      resultado: checklists.resultado,
      observaciones: checklists.observaciones,
      recibidoAt: checklists.recibidoAt,
      revisadoAt: checklists.revisadoAt,
      telefono: checklists.telefono,
      interno: equipos.interno,
      marca: equipos.marca,
      modelo: equipos.modelo,
      persona: personal.apellidoNombre,
    })
    .from(checklists)
    .innerJoin(equipos, eq(checklists.equipoId, equipos.id))
    .leftJoin(personal, eq(checklists.personalId, personal.id))
    .where(eq(checklists.id, id))
    .limit(1)

  if (!cabecera) return null

  const [items, adjuntos] = await Promise.all([
    db.select().from(checklistItems).where(eq(checklistItems.checklistId, id)).orderBy(asc(checklistItems.id)),
    db.select().from(checklistAdjuntos).where(eq(checklistAdjuntos.checklistId, id)).orderBy(asc(checklistAdjuntos.id)),
  ])

  return { ...cabecera, items, adjuntos }
}

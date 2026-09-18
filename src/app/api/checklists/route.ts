import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { checklistAdjuntos, checklistItems, checklists, equipos, personal } from '@/db/schema'
import { normalizarInterno, normalizarTelefono } from '@/lib/formato'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Ingesta de checklists desde n8n (capitulo 9 del spec).
 *
 * n8n manda:
 *   { fecha, interno, telefono, items: [{item, ok, comentario}],
 *     observaciones, adjuntos: [{url, tipo}] }
 *
 * Se guarda ademas el JSON crudo en checklists.payload: si mañana cambia el
 * formato del flujo, no se pierde nada de lo que mando el chofer.
 *
 * Es idempotente por (fecha, equipo): si el mismo equipo manda dos veces el
 * mismo dia, se actualiza la fila en vez de duplicarla.
 */
export async function POST(pedido: Request) {
  const clave = process.env.CHECKLIST_API_KEY
  if (!clave) {
    console.error('[checklists] falta CHECKLIST_API_KEY: el endpoint queda cerrado')
    return Response.json({ error: 'Endpoint no configurado.' }, { status: 503 })
  }

  if (pedido.headers.get('x-api-key') !== clave) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 })
  }

  let cuerpo: Record<string, unknown>
  try {
    cuerpo = await pedido.json()
  } catch {
    return Response.json({ error: 'El cuerpo no es JSON válido.' }, { status: 400 })
  }

  const fecha = String(cuerpo.fecha ?? '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return Response.json({ error: 'Falta la fecha, o no tiene formato aaaa-mm-dd.' }, { status: 400 })
  }

  const interno = normalizarInterno(String(cuerpo.interno ?? ''))
  if (!interno) {
    return Response.json({ error: 'Falta el interno de la unidad.' }, { status: 400 })
  }

  const [equipo] = await db.select().from(equipos).where(eq(equipos.interno, interno)).limit(1)
  if (!equipo) {
    // Se responde 422 y no 500: el flujo mando algo que la app entiende pero no
    // puede resolver. n8n lo va a ver en su propio log.
    return Response.json({ error: `No existe la unidad ${interno}.` }, { status: 422 })
  }

  // La persona se resuelve por telefono. Si no se encuentra, igual se guarda:
  // el checklist llego y perderlo seria peor que no saber quien lo mando.
  const telefono = normalizarTelefono(String(cuerpo.telefono ?? '')) ?? null
  const [quien] = telefono
    ? await db.select().from(personal).where(eq(personal.telefonoWsp, telefono)).limit(1)
    : []

  const items = Array.isArray(cuerpo.items) ? cuerpo.items : []
  const adjuntos = Array.isArray(cuerpo.adjuntos) ? cuerpo.adjuntos : []
  const observaciones = cuerpo.observaciones ? String(cuerpo.observaciones).trim() || null : null

  // Con observacion si algun item vino en falso o si el chofer escribio algo.
  const hayFalla = items.some((i) => (i as { ok?: unknown }).ok === false)
  const resultado = hayFalla || observaciones ? 'con_observacion' : 'sin_novedad'

  const valores = {
    fecha,
    equipoId: equipo.id,
    personalId: quien?.id ?? null,
    telefono,
    resultado: resultado as 'sin_novedad' | 'con_observacion',
    observaciones,
    recibidoAt: new Date(),
    payload: cuerpo,
  }

  const [guardado] = await db
    .insert(checklists)
    .values(valores)
    .onConflictDoUpdate({ target: [checklists.fecha, checklists.equipoId], set: valores })
    .returning()

  // Los items y adjuntos se reemplazan: lo ultimo que mando el flujo es lo que vale.
  await db.delete(checklistItems).where(eq(checklistItems.checklistId, guardado.id))
  await db.delete(checklistAdjuntos).where(eq(checklistAdjuntos.checklistId, guardado.id))

  if (items.length > 0) {
    await db.insert(checklistItems).values(
      items.map((i) => {
        const item = i as { item?: unknown; ok?: unknown; comentario?: unknown }
        return {
          checklistId: guardado.id,
          item: String(item.item ?? '').slice(0, 200) || 'sin nombre',
          ok: typeof item.ok === 'boolean' ? item.ok : null,
          comentario: item.comentario ? String(item.comentario) : null,
        }
      }),
    )
  }

  if (adjuntos.length > 0) {
    await db.insert(checklistAdjuntos).values(
      adjuntos.map((a) => {
        const adjunto = a as { url?: unknown; tipo?: unknown }
        return {
          checklistId: guardado.id,
          url: String(adjunto.url ?? ''),
          tipo: adjunto.tipo ? String(adjunto.tipo) : null,
        }
      }).filter((a) => a.url),
    )
  }

  return Response.json({ id: guardado.id, interno, resultado }, { status: 200 })
}

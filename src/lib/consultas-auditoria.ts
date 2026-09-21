import { and, count, desc, eq, gte, lt, sql, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { auditoria, usuarios } from '@/db/schema'
import { ZONA_HORARIA } from '@/lib/formato'

/** Cuántas líneas entran en una página del listado. */
export const POR_PAGINA = 50

export type FiltroAuditoria = {
  entidad?: string
  accion?: string
  usuarioId?: number
  desde?: string
  hasta?: string
}

/**
 * Las fechas del filtro son días de Buenos Aires, pero la columna es
 * timestamptz. Se comparan contra el arranque del día local, que es lo que el
 * usuario tiene en la cabeza cuando escribe una fecha.
 */
function arranqueDelDia(fecha: string) {
  return sql`(${fecha}::date)::timestamp AT TIME ZONE ${ZONA_HORARIA}`
}

function condiciones(filtro: FiltroAuditoria): SQL | undefined {
  const partes: SQL[] = []
  if (filtro.entidad) partes.push(eq(auditoria.entidad, filtro.entidad))
  if (filtro.accion) partes.push(eq(auditoria.accion, filtro.accion))
  if (filtro.usuarioId) partes.push(eq(auditoria.usuarioId, filtro.usuarioId))
  if (filtro.desde) partes.push(gte(auditoria.createdAt, arranqueDelDia(filtro.desde)))
  // "hasta" incluye el día entero: se corta al arranque del día siguiente.
  if (filtro.hasta) partes.push(lt(auditoria.createdAt, sql`${arranqueDelDia(filtro.hasta)} + interval '1 day'`))
  return partes.length ? and(...partes) : undefined
}

export async function registrosDeAuditoria(filtro: FiltroAuditoria, pagina: number) {
  const donde = condiciones(filtro)

  const [filas, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditoria.id,
        entidad: auditoria.entidad,
        entidadId: auditoria.entidadId,
        accion: auditoria.accion,
        antes: auditoria.antes,
        despues: auditoria.despues,
        createdAt: auditoria.createdAt,
        email: usuarios.email,
      })
      .from(auditoria)
      .leftJoin(usuarios, eq(auditoria.usuarioId, usuarios.id))
      .where(donde)
      .orderBy(desc(auditoria.createdAt), desc(auditoria.id))
      .limit(POR_PAGINA)
      .offset((pagina - 1) * POR_PAGINA),
    db.select({ total: count() }).from(auditoria).where(donde),
  ])

  return { filas, total, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) }
}

/** Las entidades que de verdad tienen registros, para armar el desplegable. */
export async function entidadesAuditadas(): Promise<string[]> {
  const filas = await db
    .selectDistinct({ entidad: auditoria.entidad })
    .from(auditoria)
    .orderBy(auditoria.entidad)
  return filas.map((f) => f.entidad)
}

/** Los usuarios que dejaron alguna línea, para el desplegable. */
export async function usuariosConAuditoria() {
  return db
    .selectDistinct({ id: usuarios.id, email: usuarios.email })
    .from(auditoria)
    .innerJoin(usuarios, eq(auditoria.usuarioId, usuarios.id))
    .orderBy(usuarios.email)
}

export async function registroDeAuditoria(id: number) {
  const [fila] = await db
    .select({
      id: auditoria.id,
      entidad: auditoria.entidad,
      entidadId: auditoria.entidadId,
      accion: auditoria.accion,
      antes: auditoria.antes,
      despues: auditoria.despues,
      createdAt: auditoria.createdAt,
      email: usuarios.email,
    })
    .from(auditoria)
    .leftJoin(usuarios, eq(auditoria.usuarioId, usuarios.id))
    .where(eq(auditoria.id, id))
    .limit(1)
  return fila ?? null
}

import { db } from '@/db'
import { auditoria } from '@/db/schema'

/**
 * Deja constancia de una escritura. CLAUDE.md: toda escritura sobre una salida,
 * un uso de liviano o un maestro tiene que quedar registrada.
 *
 * No corta la operacion si falla: es mejor perder una linea de auditoria que
 * voltear un alta que el usuario ya dio por hecha. El error queda en el log.
 */
/** Saca del registro los campos que no tienen que quedar guardados. */
function sinSecretos(valor: unknown): unknown {
  if (!valor || typeof valor !== 'object') return valor
  const copia = { ...(valor as Record<string, unknown>) }
  delete copia.passwordHash
  return copia
}

export async function auditar(registro: {
  usuarioId: number | null
  entidad: string
  entidadId: number | null
  accion: 'alta' | 'edicion' | 'baja' | 'reapertura'
  antes?: unknown
  despues?: unknown
}) {
  try {
    await db.insert(auditoria).values({
      usuarioId: registro.usuarioId,
      entidad: registro.entidad,
      entidadId: registro.entidadId,
      accion: registro.accion,
      antes: sinSecretos(registro.antes) ?? null,
      despues: sinSecretos(registro.despues) ?? null,
    })
  } catch (error) {
    console.error('[auditoria] no se pudo registrar:', error)
  }
}

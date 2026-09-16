import { sql } from 'drizzle-orm'
import { db } from '@/db'

// Siempre dinamica: es un chequeo de estado, no se cachea.
export const dynamic = 'force-dynamic'

/**
 * Chequeo de estado. Lo usa el HEALTHCHECK del Dockerfile.
 *
 * Devuelve 200 mientras el proceso este vivo, aunque la base no responda: si
 * contestara error, Docker reiniciaria el contenedor en loop por algo que no se
 * arregla reiniciando. El estado de la base va en el cuerpo, para poder mirarlo.
 */
export async function GET() {
  let base: 'ok' | 'sin conexion' = 'ok'

  try {
    await db.execute(sql`select 1`)
  } catch {
    base = 'sin conexion'
  }

  return Response.json({
    estado: 'ok',
    base,
    fecha: new Date().toISOString(),
  })
}

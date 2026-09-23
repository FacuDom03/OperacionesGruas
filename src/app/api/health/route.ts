import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { sql } from 'drizzle-orm'
import { db } from '@/db'

// Siempre dinamica: es un chequeo de estado, no se cachea.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Chequeo de estado. Lo usa el HEALTHCHECK del Dockerfile.
 *
 * Devuelve 200 mientras el proceso este vivo, aunque la base no responda: si
 * contestara error, Docker reiniciaria el contenedor en loop por algo que no se
 * arregla reiniciando. El estado va en el cuerpo, para poder mirarlo.
 *
 * Informa tambien si las migraciones estan al dia. Sin eso, un deploy con una
 * migracion sin aplicar se ve como pantallas que fallan sueltas —un PDF que
 * sale con "Application error", una seccion que no abre— y cuesta relacionarlo
 * con la causa.
 */
export async function GET() {
  let base: 'ok' | 'sin conexion' = 'ok'
  let migraciones: string = 'sin datos'

  try {
    await db.execute(sql`select 1`)
  } catch {
    base = 'sin conexion'
  }

  if (base === 'ok') {
    try {
      const archivos = (await readdir(resolve(process.cwd(), 'drizzle')))
        .filter((a) => a.endsWith('.sql')).length

      const filas = await db.execute<{ total: number }>(
        sql`select count(*)::int as total from drizzle.__drizzle_migrations`,
      )
      const aplicadas = Number((filas as unknown as { total: number }[])[0]?.total ?? 0)

      migraciones = aplicadas >= archivos
        ? `al dia (${aplicadas})`
        : `FALTAN ${archivos - aplicadas} de ${archivos}`
    } catch (error) {
      migraciones = `no se pudieron consultar: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  return Response.json({
    estado: 'ok',
    base,
    migraciones,
    fecha: new Date().toISOString(),
  })
}

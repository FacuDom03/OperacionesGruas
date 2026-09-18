import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { clientes } from '@/db/schema'

/**
 * Resuelve el cliente que se escribió en una salida.
 *
 * El campo es de texto libre con sugerencias: si lo que se escribió ya existe
 * en el maestro se usa ese, y si no, se da de alta. Comparando sin distinguir
 * mayúsculas ni espacios de más, así "techint sa " no crea un duplicado de
 * "Techint SA".
 *
 * Devuelve el id, o null si no se escribió nada.
 */
export async function clientePorNombre(texto: string | null): Promise<{ id: number; creado: boolean } | null> {
  const nombre = texto?.trim()
  if (!nombre) return null

  const [existente] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(sql`lower(btrim(${clientes.razonSocial})) = lower(${nombre})`)
    .limit(1)

  if (existente) return { id: existente.id, creado: false }

  try {
    const [nuevo] = await db.insert(clientes).values({ razonSocial: nombre }).returning({ id: clientes.id })
    return { id: nuevo.id, creado: true }
  } catch {
    // Puede haber entrado el mismo nombre desde otra pantalla al mismo tiempo:
    // el UNIQUE lo frena y alcanza con volver a buscarlo.
    const [otra] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(sql`lower(btrim(${clientes.razonSocial})) = lower(${nombre})`)
      .limit(1)
    return otra ? { id: otra.id, creado: false } : null
  }
}

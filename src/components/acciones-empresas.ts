'use server'

import { revalidatePath } from 'next/cache'
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { empresas } from '@/db/schema'
import { guardarEmpresasElegidas } from '@/lib/empresas-elegidas'

export type EstadoSelector = { mensaje?: string }

/**
 * Guarda con qué empresas se está trabajando y devuelve un mensaje para
 * mostrar en el panel: sin eso, apretar Aplicar no se siente como que hizo algo.
 */
export async function aplicarEmpresas(
  _previo: EstadoSelector,
  datos: FormData,
): Promise<EstadoSelector> {
  const activas = await db
    .select({ id: empresas.id, nombre: empresas.nombreCorto })
    .from(empresas)
    .where(eq(empresas.activa, true))
    .orderBy(asc(empresas.nombreCorto))

  const ids = datos.getAll('empresa').map(Number).filter(Boolean)

  // Elegirlas todas, o ninguna, es lo mismo que no filtrar.
  const filtra = ids.length > 0 && ids.length < activas.length
  await guardarEmpresasElegidas(filtra ? ids : [])

  revalidatePath('/', 'layout')

  if (!filtra) {
    return { mensaje: `Listo. Vas a ver las salidas de las ${activas.length} empresas.` }
  }

  const elegidas = await db
    .select({ nombre: empresas.nombreCorto })
    .from(empresas)
    .where(inArray(empresas.id, ids))
    .orderBy(asc(empresas.nombreCorto))

  return {
    mensaje:
      elegidas.length === 1
        ? `Listo. Vas a ver solo las salidas de ${elegidas[0].nombre}.`
        : `Listo. Vas a ver las salidas de ${elegidas.length} empresas: ${elegidas.map((e) => e.nombre).join(', ')}.`,
  }
}

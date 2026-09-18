'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { checklists } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { permisoRequerido } from '@/lib/permisos'

/** Mantenimiento marca que ya miró un checklist con observación. */
export async function marcarRevisado(datos: FormData) {
  const sesion = await permisoRequerido('revisar_checklists')

  const id = Number(datos.get('id'))
  const fecha = String(datos.get('fecha') ?? '')
  if (!id) redirect('/checklists')

  const [antes] = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1)
  if (antes && !antes.revisadoAt) {
    const [despues] = await db
      .update(checklists)
      .set({ revisadoPor: Number(sesion.user.id), revisadoAt: new Date() })
      .where(eq(checklists.id, id))
      .returning()

    await auditar({
      usuarioId: Number(sesion.user.id),
      entidad: 'checklists', entidadId: id, accion: 'edicion', antes, despues,
    })
  }

  revalidatePath('/checklists')
  redirect(`/checklists?fecha=${fecha}&ver=${id}`)
}

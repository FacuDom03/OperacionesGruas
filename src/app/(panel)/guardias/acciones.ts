'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { guardias } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

/** Suma a alguien a un puesto de guardia del día. */
export async function agregarGuardia(datos: FormData) {
  const sesion = await permisoRequerido('editar_salidas')

  const fecha = textoONulo(datos.get('fecha'))
  const rol = textoONulo(datos.get('rol'))
  const personalId = Number(datos.get('personalId')) || null

  if (!fecha || !rol || !personalId) {
    redirect(`/guardias?fecha=${fecha ?? ''}&error=${encodeURIComponent('Elegí un puesto y una persona.')}`)
  }

  try {
    const [despues] = await db.insert(guardias).values({ fecha, rol, personalId }).returning()
    await auditar({
      usuarioId: Number(sesion.user.id),
      entidad: 'guardias', entidadId: despues.id, accion: 'alta', despues,
    })
  } catch (error) {
    redirect(`/guardias?fecha=${fecha}&error=${encodeURIComponent(
      mensajeDeError(error, { fecha_rol_personal: 'Esa persona ya está en ese puesto ese día.' }),
    )}`)
  }

  revalidatePath('/guardias')
  revalidatePath('/')
  redirect(`/guardias?fecha=${fecha}`)
}

/** Saca a alguien de la guardia. */
export async function quitarGuardia(datos: FormData) {
  const sesion = await permisoRequerido('editar_salidas')

  const id = Number(datos.get('id'))
  const fecha = String(datos.get('fecha') ?? '')
  if (!id) redirect('/guardias')

  const [antes] = await db.select().from(guardias).where(eq(guardias.id, id)).limit(1)
  if (antes) {
    await db.delete(guardias).where(eq(guardias.id, id))
    await auditar({
      usuarioId: Number(sesion.user.id),
      entidad: 'guardias', entidadId: id, accion: 'baja', antes,
    })
  }

  revalidatePath('/guardias')
  revalidatePath('/')
  redirect(`/guardias?fecha=${fecha}`)
}

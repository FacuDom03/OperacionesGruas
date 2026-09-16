'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { lugares } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export async function guardarLugar(datos: FormData) {
  const sesion = await permisoRequerido('editar_maestros')

  const id = Number(datos.get('id')) || null
  const codigo = textoONulo(datos.get('codigo'))
  const nombre = textoONulo(datos.get('nombre'))
  const volverA = id ? `/maestros/lugares/${id}` : '/maestros/lugares/nuevo'

  if (!codigo || !nombre) {
    redirect(`${volverA}?error=${encodeURIComponent('El codigo y el nombre son obligatorios.')}`)
  }

  const valores = { codigo: codigo.toUpperCase(), nombre }

  try {
    if (id) {
      const [antes] = await db.select().from(lugares).where(eq(lugares.id, id)).limit(1)
      const [despues] = await db.update(lugares).set(valores).where(eq(lugares.id, id)).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'lugares', entidadId: id, accion: 'edicion', antes, despues })
    } else {
      const [despues] = await db.insert(lugares).values(valores).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'lugares', entidadId: despues.id, accion: 'alta', despues })
    }
  } catch (error) {
    redirect(`${volverA}?error=${encodeURIComponent(mensajeDeError(error, { codigo: 'Ya hay otro lugar con ese codigo.' }))}`)
  }

  revalidatePath('/maestros/lugares')
  redirect('/maestros/lugares')
}

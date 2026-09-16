'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { normalizarCuit, textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

const MENSAJES = {
  codigo: 'Ya hay otra empresa con ese codigo.',
  cuit: 'Ya hay otra empresa con ese CUIT.',
}

export async function guardarEmpresa(datos: FormData) {
  const sesion = await permisoRequerido('editar_maestros')

  const id = Number(datos.get('id')) || null
  const codigo = textoONulo(datos.get('codigo'))
  const razonSocial = textoONulo(datos.get('razonSocial'))
  const nombreCorto = textoONulo(datos.get('nombreCorto'))

  const volverA = id ? `/maestros/empresas/${id}` : '/maestros/empresas/nuevo'

  if (!codigo || !razonSocial || !nombreCorto) {
    redirect(`${volverA}?error=${encodeURIComponent('Codigo, razon social y nombre corto son obligatorios.')}`)
  }

  const valores = {
    codigo: codigo.toUpperCase(),
    razonSocial,
    nombreCorto,
    cuit: normalizarCuit(textoONulo(datos.get('cuit'))),
    activa: datos.get('activa') === 'on',
  }

  try {
    if (id) {
      const [antes] = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1)
      const [despues] = await db.update(empresas).set(valores).where(eq(empresas.id, id)).returning()
      await auditar({
        usuarioId: Number(sesion.user.id),
        entidad: 'empresas', entidadId: id, accion: 'edicion', antes, despues,
      })
    } else {
      const [despues] = await db.insert(empresas).values(valores).returning()
      await auditar({
        usuarioId: Number(sesion.user.id),
        entidad: 'empresas', entidadId: despues.id, accion: 'alta', despues,
      })
    }
  } catch (error) {
    redirect(`${volverA}?error=${encodeURIComponent(mensajeDeError(error, MENSAJES))}`)
  }

  revalidatePath('/maestros/empresas')
  redirect('/maestros/empresas')
}

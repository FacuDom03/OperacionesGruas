'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { normalizarCuit, textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export async function guardarCliente(datos: FormData) {
  const sesion = await permisoRequerido('editar_maestros')

  const id = Number(datos.get('id')) || null
  const razonSocial = textoONulo(datos.get('razonSocial'))
  const volverA = id ? `/maestros/clientes/${id}` : '/maestros/clientes/nuevo'

  if (!razonSocial) {
    redirect(`${volverA}?error=${encodeURIComponent('La razon social es obligatoria.')}`)
  }

  const valores = {
    razonSocial,
    cuit: normalizarCuit(textoONulo(datos.get('cuit'))),
    odooId: Number(datos.get('odooId')) || null,
    activo: datos.get('activo') === 'on',
  }

  try {
    if (id) {
      const [antes] = await db.select().from(clientes).where(eq(clientes.id, id)).limit(1)
      const [despues] = await db.update(clientes).set(valores).where(eq(clientes.id, id)).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'clientes', entidadId: id, accion: 'edicion', antes, despues })
    } else {
      const [despues] = await db.insert(clientes).values(valores).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'clientes', entidadId: despues.id, accion: 'alta', despues })
    }
  } catch (error) {
    redirect(`${volverA}?error=${encodeURIComponent(mensajeDeError(error, { razon_social: 'Ya hay otro cliente con esa razon social.' }))}`)
  }

  revalidatePath('/maestros/clientes')
  redirect('/maestros/clientes')
}

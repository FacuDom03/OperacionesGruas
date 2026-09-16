'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { personal } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { normalizarTelefono, textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export async function guardarPersona(datos: FormData) {
  const sesion = await permisoRequerido('editar_maestros')

  const id = Number(datos.get('id')) || null
  const apellidoNombre = textoONulo(datos.get('apellidoNombre'))
  const volverA = id ? `/maestros/personal/${id}` : '/maestros/personal/nuevo'

  if (!apellidoNombre) {
    redirect(`${volverA}?error=${encodeURIComponent('El apellido y nombre es obligatorio.')}`)
  }

  // El telefono es el dato que falta para que ande el WhatsApp: si lo cargan mal
  // no se entera nadie hasta que no llega el mensaje. Mejor frenar el guardado.
  const telefonoEscrito = textoONulo(datos.get('telefonoWsp'))
  const telefonoWsp = normalizarTelefono(telefonoEscrito)

  if (telefonoEscrito && !telefonoWsp) {
    redirect(`${volverA}?error=${encodeURIComponent(
      'El telefono no quedo en formato de la Cloud API (54 + 9 + area + numero, sin el 15). Ejemplo: 5491155782210.',
    )}`)
  }

  const valores = {
    apellidoNombre,
    legajo: textoONulo(datos.get('legajo')),
    documento: textoONulo(datos.get('documento')),
    empresaId: Number(datos.get('empresaId')) || null,
    puesto: textoONulo(datos.get('puesto')),
    telefonoWsp,
    esChofer: datos.get('esChofer') === 'on',
    esVerificador: datos.get('esVerificador') === 'on',
    esOperador: datos.get('esOperador') === 'on',
    activo: datos.get('activo') === 'on',
  }

  try {
    if (id) {
      const [antes] = await db.select().from(personal).where(eq(personal.id, id)).limit(1)
      const [despues] = await db.update(personal).set(valores).where(eq(personal.id, id)).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'personal', entidadId: id, accion: 'edicion', antes, despues })
    } else {
      const [despues] = await db.insert(personal).values(valores).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'personal', entidadId: despues.id, accion: 'alta', despues })
    }
  } catch (error) {
    redirect(`${volverA}?error=${encodeURIComponent(mensajeDeError(error, { documento: 'Ya hay otra persona con ese documento.' }))}`)
  }

  revalidatePath('/maestros/personal')
  redirect('/maestros/personal')
}

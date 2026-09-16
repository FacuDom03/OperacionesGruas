'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipos } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { normalizarInterno, textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export async function guardarEquipo(datos: FormData) {
  const sesion = await permisoRequerido('editar_maestros')

  const id = Number(datos.get('id')) || null
  const internoEscrito = textoONulo(datos.get('interno'))
  const tipo = textoONulo(datos.get('tipo'))
  const volverA = id ? `/maestros/equipos/${id}` : '/maestros/equipos/nuevo'

  if (!internoEscrito || !tipo) {
    redirect(`${volverA}?error=${encodeURIComponent('El interno y el tipo son obligatorios.')}`)
  }

  // GDU + tres digitos, mayuscula y sin espacios (CLAUDE.md). Acepta "111".
  const interno = normalizarInterno(internoEscrito)
  if (!/^GDU\d{3}$/.test(interno)) {
    redirect(`${volverA}?error=${encodeURIComponent(
      `"${internoEscrito}" no es un interno valido. Va GDU y tres digitos, por ejemplo GDU505.`,
    )}`)
  }

  const tns = textoONulo(datos.get('tns'))

  const valores = {
    interno,
    nroViejo: textoONulo(datos.get('nroViejo')),
    tipo,
    tns: tns ? tns.replace(',', '.') : null,
    marca: textoONulo(datos.get('marca')),
    modelo: textoONulo(datos.get('modelo')),
    patente: textoONulo(datos.get('patente'))?.toUpperCase() ?? null,
    equipoAsignado: textoONulo(datos.get('equipoAsignado')),
    activo: datos.get('activo') === 'on',
  }

  try {
    if (id) {
      const [antes] = await db.select().from(equipos).where(eq(equipos.id, id)).limit(1)
      const [despues] = await db.update(equipos).set(valores).where(eq(equipos.id, id)).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'equipos', entidadId: id, accion: 'edicion', antes, despues })
    } else {
      const [despues] = await db.insert(equipos).values(valores).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'equipos', entidadId: despues.id, accion: 'alta', despues })
    }
  } catch (error) {
    redirect(`${volverA}?error=${encodeURIComponent(mensajeDeError(error, { interno: 'Ya hay otro equipo con ese interno.' }))}`)
  }

  revalidatePath('/maestros/equipos')
  redirect('/maestros/equipos')
}

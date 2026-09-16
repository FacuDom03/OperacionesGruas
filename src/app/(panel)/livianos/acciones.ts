'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { usoLivianos } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

type EstadoLiviano = 'en_base' | 'en_uso' | 'taller' | 'no_disponible'

/**
 * Guarda una fila de la grilla del dia. Cada fila se guarda sola: si una tiene
 * un problema, el resto de lo cargado no se pierde.
 */
export async function guardarUsoLiviano(datos: FormData) {
  const sesion = await permisoRequerido('cargar_livianos')

  const id = Number(datos.get('id')) || null
  const fecha = textoONulo(datos.get('fecha'))
  const equipoId = Number(datos.get('equipoId')) || null

  if (!fecha || !equipoId) {
    redirect(`/livianos?error=${encodeURIComponent('Falta la fecha o la unidad.')}`)
  }

  const valores = {
    fecha,
    equipoId,
    personalId: Number(datos.get('personalId')) || null,
    lugarSalida: textoONulo(datos.get('lugarSalida')),
    horaSalida: textoONulo(datos.get('horaSalida')),
    lugarLlegada: textoONulo(datos.get('lugarLlegada')),
    horaLlegada: textoONulo(datos.get('horaLlegada')),
    uso: textoONulo(datos.get('uso')),
    observaciones: textoONulo(datos.get('observaciones')),
    estado: (textoONulo(datos.get('estado')) ?? 'en_base') as EstadoLiviano,
  }

  try {
    if (id) {
      const [antes] = await db.select().from(usoLivianos).where(eq(usoLivianos.id, id)).limit(1)
      const [despues] = await db.update(usoLivianos).set(valores).where(eq(usoLivianos.id, id)).returning()
      await auditar({
        usuarioId: Number(sesion.user.id),
        entidad: 'uso_livianos', entidadId: id, accion: 'edicion', antes, despues,
      })
    } else {
      const [despues] = await db
        .insert(usoLivianos)
        .values({ ...valores, registradoPor: Number(sesion.user.id) })
        .returning()
      await auditar({
        usuarioId: Number(sesion.user.id),
        entidad: 'uso_livianos', entidadId: despues.id, accion: 'alta', despues,
      })
    }
  } catch (error) {
    redirect(`/livianos?fecha=${fecha}&error=${encodeURIComponent(mensajeDeError(error))}`)
  }

  revalidatePath('/livianos')
  redirect(`/livianos?fecha=${fecha}&guardada=${equipoId}`)
}

/** Borra una fila cargada por error. Queda registrado. */
export async function borrarUsoLiviano(datos: FormData) {
  const sesion = await permisoRequerido('cargar_livianos')

  const id = Number(datos.get('id'))
  const fecha = String(datos.get('fecha') ?? '')
  if (!id) redirect('/livianos')

  const [antes] = await db.select().from(usoLivianos).where(eq(usoLivianos.id, id)).limit(1)
  if (antes) {
    await db.delete(usoLivianos).where(eq(usoLivianos.id, id))
    await auditar({
      usuarioId: Number(sesion.user.id),
      entidad: 'uso_livianos', entidadId: id, accion: 'baja', antes,
    })
  }

  revalidatePath('/livianos')
  redirect(`/livianos?fecha=${fecha}`)
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { textoONulo } from '@/lib/formato'
import { hashearPassword } from '@/lib/password'
import { permisoRequerido } from '@/lib/permisos'

type Rol = 'admin' | 'operaciones' | 'mantenimiento' | 'consulta'
const ROLES: Rol[] = ['admin', 'operaciones', 'mantenimiento', 'consulta']

const LARGO_MINIMO = 8

export async function guardarUsuario(datos: FormData) {
  const sesion = await permisoRequerido('administrar_usuarios')

  const id = Number(datos.get('id')) || null
  const email = textoONulo(datos.get('email'))?.toLowerCase()
  const rol = textoONulo(datos.get('rol')) as Rol | null
  const password = String(datos.get('password') ?? '')
  const activo = datos.get('activo') === 'on'

  const volverA = id ? `/maestros/usuarios/${id}` : '/maestros/usuarios/nuevo'
  const fallar = (mensaje: string) => redirect(`${volverA}?error=${encodeURIComponent(mensaje)}`)

  if (!email || !email.includes('@')) fallar('Poné un correo válido.')
  if (!rol || !ROLES.includes(rol)) fallar('Elegí un rol.')

  // Un admin no se puede dejar afuera a sí mismo: si se saca el rol o se
  // desactiva, no queda nadie que pueda volver a entrar a arreglarlo.
  const esUnoMismo = id === Number(sesion.user.id)
  if (esUnoMismo && rol !== 'admin') fallar('No podés sacarte a vos mismo el rol de admin.')
  if (esUnoMismo && !activo) fallar('No podés desactivar tu propio usuario.')

  // La contraseña es obligatoria al crear; al editar, en blanco significa
  // "dejala como está".
  if (!id && password.length < LARGO_MINIMO) {
    fallar(`La contraseña tiene que tener ${LARGO_MINIMO} caracteres o más.`)
  }
  if (id && password && password.length < LARGO_MINIMO) {
    fallar(`La contraseña nueva tiene que tener ${LARGO_MINIMO} caracteres o más.`)
  }

  const personalId = Number(datos.get('personalId')) || null

  try {
    if (id) {
      const [antes] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1)
      if (!antes) fallar('Ese usuario ya no existe.')

      const [despues] = await db
        .update(usuarios)
        .set({
          email: email!,
          rol: rol!,
          activo,
          personalId,
          ...(password ? { passwordHash: await hashearPassword(password) } : {}),
        })
        .where(eq(usuarios.id, id))
        .returning()

      await auditar({
        usuarioId: Number(sesion.user.id),
        entidad: 'usuarios', entidadId: id, accion: 'edicion', antes, despues,
      })
    } else {
      const [despues] = await db
        .insert(usuarios)
        .values({
          email: email!,
          rol: rol!,
          activo,
          personalId,
          passwordHash: await hashearPassword(password),
        })
        .returning()

      await auditar({
        usuarioId: Number(sesion.user.id),
        entidad: 'usuarios', entidadId: despues.id, accion: 'alta', despues,
      })
    }
  } catch (error) {
    redirect(`${volverA}?error=${encodeURIComponent(
      mensajeDeError(error, { email: 'Ya hay un usuario con ese correo.' }),
    )}`)
  }

  revalidatePath('/maestros/usuarios')
  redirect('/maestros/usuarios?guardado=1')
}

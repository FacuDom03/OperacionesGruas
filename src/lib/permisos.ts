import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { auth } from '@/auth'
import type { Rol } from '@/auth.config'
import { db } from '@/db'
import { usuarios } from '@/db/schema'

/**
 * Permisos por rol, capitulo 10 del spec. Se verifican siempre en el servidor:
 * esconder un boton en la interfaz no es un permiso.
 */
export type Accion =
  | 'ver'
  | 'editar_maestros'
  | 'editar_salidas'
  | 'cargar_livianos'
  | 'enviar_whatsapp'
  | 'revisar_checklists'
  | 'reabrir_salida'
  | 'ver_auditoria'
  | 'administrar_usuarios'
  | 'mover_herramientas'

const PERMISOS: Record<Rol, Accion[]> = {
  admin: [
    'ver', 'editar_maestros', 'editar_salidas', 'cargar_livianos',
    'enviar_whatsapp', 'revisar_checklists', 'reabrir_salida', 'ver_auditoria',
    'administrar_usuarios', 'mover_herramientas',
  ],
  operaciones: ['ver', 'editar_salidas', 'cargar_livianos', 'enviar_whatsapp', 'mover_herramientas'],
  // Mantenimiento entrega y recibe herramientas: es quien las tiene en el taller.
  mantenimiento: ['ver', 'revisar_checklists', 'mover_herramientas'],
  consulta: ['ver'],
}

export function puede(rol: Rol, accion: Accion): boolean {
  return PERMISOS[rol].includes(accion)
}

/**
 * El usuario de la sesion, tal como esta en la base **ahora**.
 *
 * La sesion es un JWT: lleva el rol y el id de cuando la persona entro, y no
 * se entera de nada de lo que pase despues. Si la desactivan o le cambian el
 * rol, el token sigue sirviendo igual hasta que vence. Por eso cada pedido
 * pregunta por la fila: es una consulta por id sobre una tabla de pocas filas.
 *
 * Devuelve null si no hay sesion, si el usuario ya no existe o si lo dieron de
 * baja.
 */
export async function usuarioDeLaSesion() {
  const sesion = await auth()
  if (!sesion?.user?.id) return null

  const [usuario] = await db
    .select({ id: usuarios.id, email: usuarios.email, rol: usuarios.rol, activo: usuarios.activo })
    .from(usuarios)
    .where(eq(usuarios.id, Number(sesion.user.id)))
    .limit(1)

  if (!usuario || !usuario.activo) return null
  return usuario
}

export type SesionViva = {
  user: { id: string; email: string; rol: Rol }
}

/**
 * Devuelve la sesion o manda a la pantalla de ingreso.
 *
 * El rol sale de la base, no del token: si un admin se lo cambia a alguien,
 * tiene que valer en el pedido siguiente y no dentro de treinta dias.
 */
export async function sesionRequerida(): Promise<SesionViva> {
  const usuario = await usuarioDeLaSesion()
  if (!usuario) redirect('/ingresar?sesion=vencida')

  return { user: { id: String(usuario.id), email: usuario.email, rol: usuario.rol } }
}

/**
 * Igual que sesionRequerida, pero ademas exige un permiso concreto.
 * Usala al principio de toda pagina o accion que escriba algo.
 *
 * Manda a /sin-permiso en vez de tirar un Error: en el build de produccion
 * React borra el mensaje de los errores del servidor, asi que el usuario veia
 * un parrafo sobre digests en lugar del motivo.
 */
export async function permisoRequerido(accion: Accion) {
  const sesion = await sesionRequerida()
  if (!puede(sesion.user.rol, accion)) redirect(`/sin-permiso?accion=${accion}`)
  return sesion
}

/**
 * Acceso a las rutas /print: sesion valida, o el token de un solo uso que usa
 * Puppeteer para armar el PDF. Nunca quedan publicas (CLAUDE.md).
 */
export async function accesoDeImpresion(ruta: string, token: string | undefined) {
  const { tokenDeImpresionValido } = await import('@/lib/token-impresion')
  if (tokenDeImpresionValido(token, ruta)) return

  // Mismo criterio que el resto: un usuario dado de baja tampoco imprime.
  if (!(await usuarioDeLaSesion())) redirect('/ingresar?sesion=vencida')
}

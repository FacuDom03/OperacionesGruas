import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import type { Rol } from '@/auth.config'

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

const PERMISOS: Record<Rol, Accion[]> = {
  admin: [
    'ver', 'editar_maestros', 'editar_salidas', 'cargar_livianos',
    'enviar_whatsapp', 'revisar_checklists', 'reabrir_salida', 'ver_auditoria',
  ],
  operaciones: ['ver', 'editar_salidas', 'cargar_livianos', 'enviar_whatsapp'],
  mantenimiento: ['ver', 'revisar_checklists'],
  consulta: ['ver'],
}

export function puede(rol: Rol, accion: Accion): boolean {
  return PERMISOS[rol].includes(accion)
}

/** Devuelve la sesion o manda a la pantalla de ingreso. */
export async function sesionRequerida() {
  const sesion = await auth()
  if (!sesion?.user) redirect('/ingresar')
  return sesion
}

/**
 * Igual que sesionRequerida, pero ademas exige un permiso concreto.
 * Usala al principio de toda pagina o accion que escriba algo.
 */
export async function permisoRequerido(accion: Accion) {
  const sesion = await sesionRequerida()
  if (!puede(sesion.user.rol, accion)) {
    throw new Error(`Tu rol (${sesion.user.rol}) no puede ${accion.replace(/_/g, ' ')}.`)
  }
  return sesion
}

/**
 * Acceso a las rutas /print: sesion valida, o el token de un solo uso que usa
 * Puppeteer para armar el PDF. Nunca quedan publicas (CLAUDE.md).
 */
export async function accesoDeImpresion(ruta: string, token: string | undefined) {
  const { tokenDeImpresionValido } = await import('@/lib/token-impresion')
  if (tokenDeImpresionValido(token, ruta)) return

  const sesion = await auth()
  if (!sesion?.user) redirect('/ingresar')
}

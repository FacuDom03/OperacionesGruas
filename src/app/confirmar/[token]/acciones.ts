'use server'

import { redirect } from 'next/navigation'
import { textoONulo } from '@/lib/formato'
import { confirmarEntrega } from '@/lib/mover-herramientas'

/**
 * Confirmación del empleado. No hay sesión ni permiso que chequear: el token
 * del link es la credencial, y se valida contra el hash guardado.
 */
export async function confirmar(datos: FormData) {
  const token = String(datos.get('token') ?? '')
  const nota = textoONulo(datos.get('nota'))

  const ok = await confirmarEntrega(token, nota)

  redirect(ok
    ? `/confirmar/${token}?listo=1`
    : `/confirmar/${token}?error=${encodeURIComponent('No se pudo confirmar. El link puede estar vencido o ya usado.')}`)
}

import { cookies } from 'next/headers'

/**
 * Con que empresas del grupo esta trabajando el usuario.
 *
 * No es un permiso: es una comodidad para no tener que mirar las salidas de las
 * 10 empresas cuando estas buscando un trabajo de una sola. Queda en una cookie
 * asi sobrevive a la navegacion y a cerrar el navegador.
 *
 * Devuelve null cuando no hay filtro (todas), que es distinto de una lista
 * vacia: una lista vacia seria "ninguna" y no tendria sentido mostrar nada.
 */
const COOKIE = 'empresas-elegidas'

export async function empresasElegidas(): Promise<number[] | null> {
  const valor = (await cookies()).get(COOKIE)?.value
  if (!valor) return null

  const ids = valor.split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0)
  return ids.length > 0 ? ids : null
}

export async function guardarEmpresasElegidas(ids: number[]) {
  const galletas = await cookies()

  if (ids.length === 0) {
    galletas.delete(COOKIE)
    return
  }

  galletas.set(COOKIE, ids.join(','), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

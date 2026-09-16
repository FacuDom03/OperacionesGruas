/**
 * Traduce los errores de Postgres a algo que se pueda leer en pantalla.
 * Los codigos estan en https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const UNICO = '23505'
const CLAVE_FORANEA = '23503'
const CHECK = '23514'

/**
 * Drizzle envuelve el error del driver en otro error y deja el original en
 * `cause`, asi que el codigo de Postgres no esta en el primer nivel. Hay que
 * recorrer la cadena hasta encontrarlo.
 */
function errorDePostgres(error: unknown): { code?: string; constraint_name?: string } {
  let actual = error as { code?: string; constraint_name?: string; cause?: unknown } | undefined
  for (let vuelta = 0; actual && vuelta < 5; vuelta++) {
    if (typeof actual.code === 'string') return actual
    actual = actual.cause as typeof actual
  }
  return {}
}

export function mensajeDeError(error: unknown, porCampo: Record<string, string> = {}): string {
  const e = errorDePostgres(error)

  if (e?.code === UNICO) {
    const restriccion = e.constraint_name ?? ''
    for (const [clave, mensaje] of Object.entries(porCampo)) {
      if (restriccion.includes(clave)) return mensaje
    }
    return 'Ya existe otro registro con ese valor.'
  }

  if (e?.code === CLAVE_FORANEA) {
    return 'No se puede: hay otros registros que dependen de este.'
  }

  if (e?.code === CHECK) {
    return 'Alguno de los valores esta fuera de lo permitido.'
  }

  console.error('[error no previsto]', error)
  return 'No se pudo guardar. Proba de nuevo o avisá a sistemas.'
}

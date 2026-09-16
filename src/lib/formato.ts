/**
 * Formatos y normalizaciones del proyecto. Las reglas estan en CLAUDE.md,
 * seccion "Idioma y formatos".
 */

export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires'

/** Una fecha `date` de Postgres llega como 'aaaa-mm-dd'. Se muestra dd/mm/aaaa. */
export function formatearFecha(fecha: string | Date | null | undefined): string {
  if (!fecha) return ''
  const texto = typeof fecha === 'string' ? fecha : fecha.toISOString().slice(0, 10)
  const [anio, mes, dia] = texto.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** Una hora `time` de Postgres llega como 'HH:mm:ss'. Se muestra HH:mm. */
export function formatearHora(hora: string | null | undefined): string {
  return hora ? hora.slice(0, 5) : ''
}

/** dd/mm/aaaa HH:mm para los timestamptz, siempre en hora de Buenos Aires. */
export function formatearFechaHora(fecha: Date | null | undefined): string {
  if (!fecha) return ''
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha)
}

/** El dia de hoy en Buenos Aires, como 'aaaa-mm-dd' (que es lo que espera `date`). */
export function hoy(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * Interno de equipo: GDU + tres digitos, mayuscula y sin espacios.
 * Acepta "111", "gdu111", "GDU 111" y devuelve "GDU111".
 * Si no tiene esa forma lo devuelve limpio pero sin inventar nada.
 */
export function normalizarInterno(texto: string): string {
  const limpio = texto.toUpperCase().replace(/\s+/g, '')
  const soloNumero = limpio.match(/^(\d{1,3})$/)
  if (soloNumero) return `GDU${soloNumero[1].padStart(3, '0')}`
  const conPrefijo = limpio.match(/^GDU(\d{1,3})$/)
  if (conPrefijo) return `GDU${conPrefijo[1].padStart(3, '0')}`
  return limpio
}

/**
 * Telefono a E.164 sin el "+", que es como los espera la Cloud API:
 * 54 + 9 + area + numero. El 9 va siempre: es lo que marca que es un celular
 * argentino, y sin el el mensaje no llega.
 *
 * Devuelve null si no queda un celular argentino completo, y la pantalla pide
 * cargarlo de nuevo. Es a proposito: un telefono mal guardado no se nota hasta
 * que el mensaje no llega, y para entonces la salida ya se mando.
 *
 * Casos que resuelve:
 *   +54 9 11 5578-2210  ->  5491155782210
 *   11 5578-2210        ->  5491155782210  (agrega el 54 y el 9)
 *   54 11 5578-2210     ->  5491155782210  (le faltaba el 9)
 *   011 15 5578 2210    ->  null           (el 15 deja un digito de mas)
 *   15-5578-2210        ->  null           (es el 15 local, falta el area)
 */
export function normalizarTelefono(texto: string | null | undefined): string | null {
  if (!texto) return null

  let digitos = texto.replace(/\D/g, '')
  if (!digitos) return null

  if (digitos.startsWith('00')) digitos = digitos.slice(2)

  // Parte nacional: area + numero, sin el 54 del pais ni el 9 de celular.
  let nacional: string
  if (digitos.startsWith('54')) {
    nacional = digitos.slice(2)
    if (nacional.startsWith('9')) nacional = nacional.slice(1)
  } else {
    nacional = digitos.replace(/^0/, '')
  }

  // Ningun codigo de area argentino empieza con 15: si empieza asi, lo que hay
  // es un numero local con el prefijo 15 y sin area. No se puede adivinar cual.
  if (nacional.startsWith('15')) return null

  // Area (2 a 4 digitos) + numero: siempre 10 en total.
  return nacional.length === 10 ? `549${nacional}` : null
}

/** Texto del formulario: recortado, y null si quedo vacio. */
export function textoONulo(valor: FormDataEntryValue | null): string | null {
  const texto = String(valor ?? '').trim()
  return texto === '' ? null : texto
}

/**
 * CUIT a nn-nnnnnnnn-n. Si no tiene 11 digitos se devuelve como vino: puede ser
 * un dato a medio cargar y no conviene deformarlo.
 */
export function normalizarCuit(texto: string | null | undefined): string | null {
  if (!texto) return null
  const digitos = texto.replace(/\D/g, '')
  if (digitos.length !== 11) return texto.trim() || null
  return `${digitos.slice(0, 2)}-${digitos.slice(2, 10)}-${digitos.slice(10)}`
}

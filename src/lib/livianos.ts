import { ZONA_HORARIA } from '@/lib/formato'

/** Horas sin hora de regreso a partir de las cuales la grilla avisa. */
export const HORAS_SIN_REGRESO = 12

/** Reloj de pared de Buenos Aires: 'aaaa-mm-dd' y 'HH:mm' de ahora mismo. */
function ahoraEnBuenosAires() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date())

  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value
  return {
    fecha: `${valor('year')}-${valor('month')}-${valor('day')}`,
    hora: `${valor('hour')}:${valor('minute')}`,
  }
}

/** Pasa 'aaaa-mm-dd' + 'HH:mm' a minutos, para poder restar dos momentos. */
function aMinutos(fecha: string, hora: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const [h, m] = hora.split(':').map(Number)
  // Se comparan dos relojes de pared de la misma zona, asi que el huso se
  // cancela: no hace falta escribir el -03:00 en ningun lado.
  return Date.UTC(anio, mes - 1, dia, h, m) / 60000
}

/**
 * Cuantas horas hace que salio una unidad que todavia no volvio.
 * Devuelve null si ya volvio, si no tiene hora de salida, o si la salida es a
 * futuro. Es lo que alimenta la alerta de la pantalla (mockup 4).
 */
export function horasSinRegreso(uso: {
  fecha: string
  horaSalida: string | null
  horaLlegada: string | null
}): number | null {
  if (!uso.horaSalida || uso.horaLlegada) return null

  const ahora = ahoraEnBuenosAires()
  const minutos = aMinutos(ahora.fecha, ahora.hora) - aMinutos(uso.fecha, uso.horaSalida.slice(0, 5))

  return minutos > 0 ? minutos / 60 : null
}

export function sinRegresoHaceMucho(uso: {
  fecha: string
  horaSalida: string | null
  horaLlegada: string | null
}): boolean {
  const horas = horasSinRegreso(uso)
  return horas !== null && horas >= HORAS_SIN_REGRESO
}

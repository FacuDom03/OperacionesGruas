import { ZONA_HORARIA } from '@/lib/formato'

/**
 * Grupos de color del calendario, como en la leyenda del mockup. El tipo de
 * equipo es texto libre (viene del Excel), asi que se agrupa por como empieza.
 */
export type GrupoUnidad = 'gruas' | 'camiones' | 'autoelevadores' | 'otros'

export const GRUPOS: { grupo: GrupoUnidad; texto: string; color: string; fondo: string }[] = [
  { grupo: 'gruas', texto: 'Grúas móviles', color: '#b45309', fondo: '#fdf4e8' },
  { grupo: 'camiones', texto: 'Camiones y tractores', color: '#0f766e', fondo: '#eaf5f4' },
  { grupo: 'autoelevadores', texto: 'Autoelevadores', color: '#6d28d9', fondo: '#f2ecfb' },
  { grupo: 'otros', texto: 'Otras unidades', color: '#64748b', fondo: '#eef1f5' },
]

export function grupoDeTipo(tipo: string): GrupoUnidad {
  const t = tipo.toLowerCase()
  if (t.includes('grua') || t.includes('grúa')) return 'gruas'
  if (t.includes('camion') || t.includes('camión') || t.includes('tractor')) return 'camiones'
  if (t.includes('autoelevador') || t.includes('manipulador')) return 'autoelevadores'
  return 'otros'
}

export function colorDeGrupo(grupo: GrupoUnidad) {
  return GRUPOS.find((g) => g.grupo === grupo)!
}

/* ── Cuentas de fechas, siempre sobre 'aaaa-mm-dd' ───────────────────── */

export function aFecha(texto: string): Date {
  const [anio, mes, dia] = texto.split('-').map(Number)
  // Mediodia UTC: asi ningun corrimiento de huso cambia el dia.
  return new Date(Date.UTC(anio, mes - 1, dia, 12))
}

export function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

export function sumarDias(texto: string, dias: number): string {
  const f = aFecha(texto)
  f.setUTCDate(f.getUTCDate() + dias)
  return aTexto(f)
}

export function sumarMeses(texto: string, meses: number): string {
  const f = aFecha(texto)
  f.setUTCMonth(f.getUTCMonth() + meses, 1)
  return aTexto(f)
}

/** El lunes de la semana de esa fecha. La semana arranca lunes, como el mockup. */
export function lunesDe(texto: string): string {
  const f = aFecha(texto)
  const dia = f.getUTCDay() // 0 domingo
  return sumarDias(texto, dia === 0 ? -6 : 1 - dia)
}

export function diasDeLaSemana(texto: string): string[] {
  const lunes = lunesDe(texto)
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

/** Las semanas completas que cubren el mes, para la grilla de la vista mes. */
export function semanasDelMes(texto: string): string[][] {
  const f = aFecha(texto)
  const primero = aTexto(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1, 12)))
  const ultimo = aTexto(new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 0, 12)))

  const semanas: string[][] = []
  let cursor = lunesDe(primero)
  while (cursor <= ultimo) {
    semanas.push(diasDeLaSemana(cursor))
    cursor = sumarDias(cursor, 7)
  }
  return semanas
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function nombreDia(texto: string): string {
  const dia = aFecha(texto).getUTCDay()
  return DIAS[dia === 0 ? 6 : dia - 1]
}

export function numeroDia(texto: string): string {
  return texto.slice(8, 10)
}

export function mesYAnio(texto: string): string {
  return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HORARIA, month: 'long', year: 'numeric' })
    .format(aFecha(texto))
}

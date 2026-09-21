/**
 * Central Operativa — Gruas Daniele
 * Ayuda para las pruebas: el primer dia sin salidas cargadas.
 *
 * Las salidas tienen UNIQUE (fecha, unidad, trabajo), asi que una prueba que
 * carga siempre en la misma fecha choca con lo que dejo la corrida anterior y
 * falla por un motivo que no es el que se esta probando.
 */
export function masDias(fecha, n) {
  const f = new Date(`${fecha}T12:00:00Z`)
  f.setUTCDate(f.getUTCDate() + n)
  return f.toISOString().slice(0, 10)
}

export async function diaLibre(page, base, desde = '2027-01-01', intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    const candidata = masDias(desde, i)
    await page.goto(`${base}/salidas?fecha=${candidata}`)
    await page.waitForLoadState('networkidle')
    if (await page.locator('table tbody tr').count() === 0) return candidata
  }
  throw new Error(`No hay ningun dia libre en los ${intentos} posteriores a ${desde}.`)
}

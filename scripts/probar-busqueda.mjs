/**
 * Central Operativa — Gruas Daniele
 * Prueba la busqueda de salidas: por numero, cliente, unidad, persona, rango de
 * fechas y estado, con el filtro de empresas de la cabecera.
 *
 *   npm run build && npm start
 *   node scripts/probar-busqueda.mjs
 *
 * Carga una salida de prueba en un dia libre y la deja.
 */
import { chromium } from 'playwright'
import { diaLibre } from './dia-libre.mjs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
let fallas = 0
const ok = (t) => console.log('  OK    ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }
const tiene = (texto, buscado) => texto.toLowerCase().includes(buscado.toLowerCase())

const nav = await chromium.launch()
const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

// Una salida con datos conocidos, en un dia libre.
const FECHA = await diaLibre(page, BASE, '2027-03-01')
const CLIENTE = `Cliente Buscado ${Date.now().toString().slice(-5)}`
await page.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
await page.selectOption('select[name=equipoId]', { index: 2 })
await page.selectOption('select[name=empresaId]', { index: 1 })
await page.fill('input[name=horaSalida]', '06:45')
await page.fill('input[name=cliente]', CLIENTE)
await page.fill('input[name=ot]', 'OT-BUSCA-1')
await page.fill('input[name=lugarDescarga]', 'Obra del Riachuelo')
await page.selectOption('select[name=personalId]', { index: 1 })
const PERSONA = (await page.locator('select[name=personalId] option').nth(1).textContent() ?? '').trim()
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1500)
if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
  await page.click('form button:has-text("Guardar igual")')
  await page.waitForTimeout(1500)
}

const cuerpoDia = await page.locator('main').innerText()
const NUMERO = cuerpoDia.match(/SAL-\d{4}-\d{4}/)?.[0]
const INTERNO = cuerpoDia.match(/GDU\d{3}/)?.[0]
NUMERO ? ok(`salida de prueba ${NUMERO} el ${FECHA}`) : fallo('no se cargo la salida de prueba')

/** Busca y devuelve el texto de la tabla de resultados. */
async function buscar(parametros) {
  await page.goto(`${BASE}/salidas/buscar?${new URLSearchParams(parametros)}`)
  await page.waitForLoadState('networkidle')
  return page.locator('main').innerText()
}

// ── se llega desde el listado del dia ────────────────────────────────────
await page.goto(`${BASE}/salidas`)
await page.waitForLoadState('networkidle')
await page.locator('main a[href="/salidas/buscar"]').count() > 0
  ? ok('hay un boton de buscar en el listado') : fallo('no hay como llegar a la busqueda')

// ── sin filtros no trae media base ───────────────────────────────────────
tiene(await buscar({}), 'Escribí algo para buscar')
  ? ok('sin filtros no busca nada') : fallo('busco sin filtros')

// ── por numero, entero y por el final ────────────────────────────────────
tiene(await buscar({ q: NUMERO }), NUMERO)
  ? ok('encuentra por numero completo') : fallo('no encontro por numero')
tiene(await buscar({ q: NUMERO.slice(-4) }), NUMERO)
  ? ok('encuentra por los ultimos digitos del numero') : fallo('no encontro por el final del numero')

// ── por cliente, OT, unidad y lugar ──────────────────────────────────────
tiene(await buscar({ q: CLIENTE }), NUMERO) ? ok('encuentra por cliente') : fallo('no encontro por cliente')
tiene(await buscar({ q: 'OT-BUSCA' }), NUMERO) ? ok('encuentra por OT') : fallo('no encontro por OT')
tiene(await buscar({ q: INTERNO }), NUMERO) ? ok('encuentra por interno de la unidad') : fallo('no encontro por interno')
tiene(await buscar({ q: 'riachuelo' }), NUMERO) ? ok('encuentra por lugar, sin distinguir mayusculas') : fallo('no encontro por lugar')

// ── por la persona que fue ───────────────────────────────────────────────
if (PERSONA) {
  const apellido = PERSONA.split(' ')[0]
  tiene(await buscar({ q: apellido }), NUMERO)
    ? ok(`encuentra por quien fue (${apellido})`) : fallo('no encontro por la persona asignada', apellido)
} else {
  ok('sin personal asignado, no se prueba por persona')
}

// ── rango de fechas ──────────────────────────────────────────────────────
tiene(await buscar({ q: CLIENTE, desde: FECHA, hasta: FECHA }), NUMERO)
  ? ok('el rango que la incluye la trae') : fallo('el rango exacto no la trajo')
tiene(await buscar({ q: CLIENTE, hasta: '2020-01-01' }), 'No se encontró')
  ? ok('un rango que no la incluye no la trae') : fallo('el rango no filtro')

// ── estado ───────────────────────────────────────────────────────────────
tiene(await buscar({ q: CLIENTE, estado: 'finalizado' }), 'No se encontró')
  ? ok('el filtro de estado filtra') : fallo('el estado no filtro')

// ── no encontrar algo lo dice ────────────────────────────────────────────
tiene(await buscar({ q: 'zzz-esto-no-existe' }), 'No se encontró')
  ? ok('avisa cuando no hay resultados') : fallo('no avisa')

// ── respeta el filtro de empresas de la cabecera ─────────────────────────
await page.goto(`${BASE}/salidas`)
await page.click('summary')
await page.waitForTimeout(400)
const casillas = page.locator('details form input[name=empresa]')
const cuantas = await casillas.count()
if (cuantas > 1) {
  // Queda elegida una sola empresa, y no la de la salida de prueba.
  for (let i = 0; i < cuantas - 1; i++) await casillas.nth(i).uncheck()
  await casillas.nth(cuantas - 1).check()
  await page.click('details form button:has-text("Aplicar")')
  await page.waitForTimeout(2200)

  const conFiltro = await buscar({ q: CLIENTE })
  tiene(conFiltro, 'solo en las empresas elegidas') ? ok('avisa que esta filtrando por empresa') : fallo('no avisa del filtro')
  tiene(conFiltro, NUMERO) ? fallo('ignoro el filtro de empresas') : ok('el filtro de empresas alcanza a la busqueda')

  // Se deja como estaba: todas.
  await page.goto(`${BASE}/salidas`)
  await page.click('summary')
  await page.waitForTimeout(400)
  await page.click('details form button:has-text("Ver todas")')
  await page.waitForTimeout(2200)
} else {
  fallo('no se pudo abrir el selector de empresas')
}

console.log(fallas === 0 ? '\nTodo bien.' : `\n${fallas} problema(s).`)
await nav.close()
process.exit(fallas === 0 ? 0 : 1)

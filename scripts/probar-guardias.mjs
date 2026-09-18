/**
 * Central Operativa — Gruas Daniele
 * Prueba de la guardia del dia y su tarjeta en el tablero.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-guardias.mjs
 *
 * Espera empezar sin guardia cargada hoy. Deja tres puestos: borralos despues.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

const nav = await chromium.launch()
const page = await (await nav.newContext({ viewport: { width: 1440, height: 1000 } })).newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

// Sin guardia cargada, el tablero lo dice.
;(await page.textContent('body')).includes('Sin guardia cargada')
  ? ok('el tablero avisa que no hay guardia') : fallo('no muestra el estado vacío')

// Cargar dos puestos.
await page.goto(`${BASE}/guardias?fecha=${HOY}`)
async function sumar(rol, indice) {
  await page.selectOption('select[name=rol]', rol)
  await page.selectOption('select[name=personalId]', { index: indice })
  await page.click('form button:has-text("Sumar")')
  await page.waitForTimeout(1200)
}
await sumar('chofer_grua', 1)
await sumar('ayudante', 2)
await sumar('ayudante', 3)

let cuerpo = await page.textContent('body')
cuerpo.includes('Chofer grúa') && cuerpo.includes('Ayudante')
  ? ok('quedan los puestos cargados') : fallo('no se cargaron')
;(await page.locator('form button:has-text("Quitar")').count()) === 3
  ? ok('admite dos personas en el mismo puesto') : fallo('no admite repetir puesto')

// La misma persona dos veces en el mismo puesto: avisa, no explota.
await page.selectOption('select[name=rol]', 'chofer_grua')
await page.selectOption('select[name=personalId]', { index: 1 })
await page.click('form button:has-text("Sumar")')
await page.waitForTimeout(1200)
;(await page.textContent('body')).includes('ya está en ese puesto')
  ? ok('avisa si la persona ya está en ese puesto') : fallo('no avisó el duplicado')

// El tablero muestra la tarjeta.
await page.goto(`${BASE}/`)
cuerpo = await page.textContent('body')
cuerpo.includes('GUARDIA DE HOY') || cuerpo.includes('Guardia de hoy')
  ? ok('el tablero muestra la tarjeta de guardia') : fallo('falta la tarjeta')
cuerpo.includes('Chofer grúa') ? ok('la tarjeta lista los puestos') : fallo('la tarjeta está vacía')

// Quitar a uno.
await page.goto(`${BASE}/guardias?fecha=${HOY}`)
await page.click('form button:has-text("Quitar")')
await page.waitForTimeout(1200)
;(await page.locator('form button:has-text("Quitar")').count()) === 2
  ? ok('se puede quitar a alguien') : fallo('no se quitó')

// Consulta no edita.
const page2 = await (await nav.newContext()).newPage()
await page2.goto(`${BASE}/ingresar`)
await page2.fill('input[name=email]', 'consulta@gruasdaniele.com')
await page2.fill('input[name=password]', 'consulta-prueba-123')
await Promise.all([page2.waitForURL(`${BASE}/`), page2.click('form button')])
await page2.goto(`${BASE}/guardias?fecha=${HOY}`)
;(await page2.locator('form button:has-text("Sumar")').count()) === 0
  ? ok('consulta ve la guardia pero no la edita') : fallo('consulta puede editar')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

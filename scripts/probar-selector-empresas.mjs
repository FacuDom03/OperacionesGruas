/**
 * Central Operativa — Gruas Daniele
 * Prueba del selector de empresas: que confirme lo que se aplico y que el
 * mensaje no quede pegado al reabrir el panel.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-selector-empresas.mjs
 *
 * Deja el filtro puesto en una empresa: acordate de volver a "Ver todas".
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 800 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

const mensaje = () => page.locator('details form p').last().textContent()

// Una sola empresa.
await page.click('summary')
await page.waitForTimeout(400)
const casillas = page.locator('details form input[name=empresa]')
const n = await casillas.count()
for (let i = 1; i < n; i++) await casillas.nth(i).uncheck()
const nombre = (await page.locator('details form label').nth(0).textContent()).trim()
await page.click('details form button:has-text("Aplicar")')
await page.waitForTimeout(2200)

let texto = await mensaje()
texto.includes('Listo') && texto.includes(nombre)
  ? ok(`confirma con el nombre: "${texto.trim()}"`) : fallo('sin confirmación para una', texto)

// Dos empresas.
for (let i = 0; i < n; i++) await casillas.nth(i).uncheck()
await casillas.nth(0).check()
await casillas.nth(1).check()
await page.click('details form button:has-text("Aplicar")')
await page.waitForTimeout(2200)
texto = await mensaje()
texto.includes('2 empresas') ? ok(`confirma dos: "${texto.trim()}"`) : fallo('mal el mensaje de dos', texto)

// Ver todas.
await page.click('details form button:has-text("Ver todas")')
await page.waitForTimeout(2200)
texto = await mensaje()
const dice = /de las \d+ empresas/.test(texto)
dice ? ok(`confirma todas: "${texto.trim()}"`) : fallo('mal el mensaje de todas', texto)
;(await page.locator('summary').textContent()).includes('Todas (')
  ? ok('el rótulo vuelve a "Todas (N)"') : fallo('el rótulo no volvió')

// Al cerrar y reabrir, el mensaje viejo no queda pegado.
await page.click('summary')
await page.waitForTimeout(300)
await page.click('summary')
await page.waitForTimeout(400)
;(await page.locator('details form p').count()) === 1
  ? ok('al reabrir no queda el mensaje anterior') : fallo('el mensaje quedó pegado')

// Y el filtro sigue filtrando de verdad.
for (let i = 1; i < n; i++) await casillas.nth(i).uncheck()
await page.click('details form button:has-text("Aplicar")')
await page.waitForTimeout(2200)
const cookie = (await ctx.cookies()).find((c) => c.name === 'empresas-elegidas')
cookie ? ok(`la cookie queda seteada (${cookie.value})`) : fallo('no guardó la cookie')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

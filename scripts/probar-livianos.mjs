/**
 * Central Operativa — Gruas Daniele
 * Prueba de la grilla de livianos. Mismo requisito: Playwright aparte.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   HOY=$(TZ=America/Argentina/Buenos_Aires date +%F) node scripts/probar-livianos.mjs
 *
 * Carga movimientos de prueba hoy y ayer: borralos despues.
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
const HOY = process.env.HOY
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

async function esperaTexto(page, texto, que) {
  try { await page.waitForSelector(`text=${texto}`, { timeout: 15000 }); ok(que) }
  catch { fallo(que, `(no aparecio "${texto}")`) }
}

async function entrar(page, email, password) {
  await page.goto(`${BASE}/ingresar`)
  await page.fill('input[name=email]', email)
  await page.fill('input[name=password]', password)
  await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button:has-text("Entrar")')])
}

const nav = await chromium.launch()
const ctx = await nav.newContext()
const page = await ctx.newPage()
await entrar(page, 'admin@gruasdaniele.com', 'clave-de-prueba-123')

await page.goto(`${BASE}/livianos`)
await esperaTexto(page, 'Vehiculos livianos del', 'abre la grilla del dia')
;(await page.textContent('body')).includes('Ver las 18 unidades')
  ? ok('reconoce las 18 unidades livianas') : fallo('no conto las livianas')

// cargar un movimiento en la primera unidad
await page.click('button:has-text("Ver las 18 unidades")')
await page.waitForTimeout(500)
const fila = page.locator('form').filter({ hasText: 'GDU001' }).first()
await fila.locator('select[name=personalId]').selectOption({ index: 1 })
await fila.locator('input[name=lugarSalida]').fill('Base')
await fila.locator('input[name=horaSalida]').fill('07:30')
await fila.locator('input[name=uso]').fill('tramites')
await fila.locator('select[name=estado]').selectOption('en_uso')
await fila.locator('button:has-text("Guardar")').click()
await esperaTexto(page, 'Movimiento guardado', 'guarda un movimiento en linea')

// la alerta de sin regreso: se carga una salida de ayer sin llegada
const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
await page.goto(`${BASE}/livianos?fecha=${ayer}`)
await page.click('button:has-text("Ver las 18 unidades")')
await page.waitForTimeout(500)
const fila2 = page.locator('form').filter({ hasText: 'GDU002' }).first()
await fila2.locator('input[name=lugarSalida]').fill('Casona')
await fila2.locator('input[name=horaSalida]').fill('08:00')
await fila2.locator('button:has-text("Guardar")').click()
await page.waitForTimeout(1500)
await page.goto(`${BASE}/livianos?fecha=${ayer}`)
await esperaTexto(page, 'sin hora de regreso', 'avisa la unidad que no volvio')
;(await page.textContent('body')).includes('sin regreso hace')
  ? ok('muestra hace cuantas horas en la fila') : fallo('falta el detalle por fila')

// el movimiento de hoy todavia no dispara la alerta
await page.goto(`${BASE}/livianos`)
;(await page.textContent('body')).includes('mas de 12 h sin hora de regreso')
  ? fallo('avisa por una salida de hace un rato') : ok('no avisa por la salida de hoy')

// PDF del dia
const res = await ctx.request.get(`${BASE}/api/pdf/livianos/${HOY}`, { timeout: 90000 })
const cuerpo = await res.body()
res.status() === 200 && cuerpo.subarray(0, 5).toString() === '%PDF-'
  ? ok(`PDF del dia (${(cuerpo.length / 1024).toFixed(0)} kB)`) : fallo('PDF del dia', res.status())
writeFileSync('livianos-dia.pdf', cuerpo)

// PDF del mes
const mes = HOY.slice(0, 7)
const res2 = await ctx.request.get(`${BASE}/api/pdf/livianos/mes/${mes}`, { timeout: 90000 })
const cuerpo2 = await res2.body()
res2.status() === 200 && cuerpo2.subarray(0, 5).toString() === '%PDF-'
  ? ok(`PDF del mes (${(cuerpo2.length / 1024).toFixed(0)} kB)`) : fallo('PDF del mes', res2.status())
writeFileSync('livianos-mes.pdf', cuerpo2)

// consulta no puede editar
const page2 = await (await nav.newContext()).newPage()
await entrar(page2, 'consulta@gruasdaniele.com', 'consulta-prueba-123')
await page2.goto(`${BASE}/livianos`)
await page2.click('button:has-text("Ver las 18 unidades")')
await page2.waitForTimeout(500)
;(await page2.locator('form button:has-text("Guardar")').count()) === 0
  ? ok('consulta ve la grilla pero no puede guardar') : fallo('consulta puede guardar')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

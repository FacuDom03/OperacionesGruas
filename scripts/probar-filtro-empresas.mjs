/**
 * Central Operativa — Gruas Daniele
 * Prueba del filtro por empresa. Necesita Playwright aparte, como las otras.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-filtro-empresas.mjs
 *
 * Carga dos salidas de prueba el 01/10/2026: borralas despues.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const FECHA = '2026-10-01'
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

const nav = await chromium.launch()
const ctx = await nav.newContext()
const page = await ctx.newPage()

await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button:has-text("Entrar")')])

async function guardar(page) {
  await page.click('form button:has-text("Guardar")')
  await page.waitForTimeout(1200)
  if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
    await page.click('form button:has-text("Guardar igual")')
    await page.waitForTimeout(1200)
  }
}

// Dos salidas, cada una de una empresa distinta.
const empresas = []
for (const [i, indiceEmpresa] of [[1, 1], [2, 2]].entries()) {
  await page.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
  await page.selectOption('select[name=equipoId]', { index: indiceEmpresa[0] })
  const opcion = await page.locator('select[name=empresaId] option').nth(indiceEmpresa[1]).textContent()
  empresas.push(opcion.trim())
  await page.selectOption('select[name=empresaId]', { index: indiceEmpresa[1] })
  await page.fill('input[name=horaSalida]', i === 0 ? '07:00' : '18:00')
  await guardar(page)
}
ok(`dos salidas cargadas: ${empresas.join(' y ')}`)

await page.goto(`${BASE}/salidas?fecha=${FECHA}`)
let cuerpo = await page.textContent('body')
cuerpo.includes('2 salidas') ? ok('sin filtro se ven las dos') : fallo('sin filtro', cuerpo.match(/\d+ salidas?/)?.[0])
const dice = /Empresa:\s*Todas \(\d+\)/.test(cuerpo)
dice ? ok('la cabecera dice "Todas (N)"') : fallo('falta el selector')

// Elegir solo la primera empresa.
await page.click('summary')
await page.waitForTimeout(300)
const casillas = page.locator('form input[name=empresa]')
const total = await casillas.count()
for (let i = 0; i < total; i++) await casillas.nth(i).uncheck()
const etiqueta = page.locator('form label').filter({ hasText: empresas[0] }).first()
await etiqueta.locator('input[name=empresa]').check()
await page.click('form button:has-text("Aplicar")')
await page.waitForTimeout(2000)

cuerpo = await page.textContent('body')
cuerpo.includes('1 salida') && cuerpo.includes('en las empresas elegidas')
  ? ok(`con el filtro queda 1 salida (${empresas[0]})`) : fallo('el filtro no redujo', cuerpo.match(/\d+ salidas?[^.]*/)?.[0])
cuerpo.includes(empresas[0]) && !cuerpo.includes(`>${empresas[1]}<`)
  ? ok('se ve la empresa elegida y no la otra') : fallo('mezcla empresas')

// El filtro sobrevive a navegar a otra pantalla y volver.
await page.goto(`${BASE}/maestros`)
await page.goto(`${BASE}/salidas?fecha=${FECHA}`)
;(await page.textContent('body')).includes('1 salida')
  ? ok('el filtro se mantiene al navegar') : fallo('se perdio el filtro')

// El PDF del parte del dia respeta el filtro.
const conFiltro = await ctx.request.get(`${BASE}/api/pdf/dia/${FECHA}?empresas=2`, { timeout: 90000 })
const sinFiltro = await ctx.request.get(`${BASE}/api/pdf/dia/${FECHA}`, { timeout: 90000 })
const a = (await conFiltro.body()).length, b = (await sinFiltro.body()).length
conFiltro.status() === 200 && sinFiltro.status() === 200 && a < b
  ? ok(`el PDF filtrado es mas chico (${(a/1024).toFixed(0)} kB vs ${(b/1024).toFixed(0)} kB)`)
  : fallo('el PDF no respeta el filtro', `${a} vs ${b}`)

// Volver a todas.
await page.goto(`${BASE}/salidas?fecha=${FECHA}`)
await page.click('summary')
await page.waitForTimeout(300)
await page.click('form button:has-text("Ver todas")')
await page.waitForTimeout(2000)
;(await page.textContent('body')).includes('2 salidas')
  ? ok('"Ver todas" vuelve a mostrar todo') : fallo('no volvio a todas')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

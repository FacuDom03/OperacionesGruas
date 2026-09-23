/**
 * Central Operativa — Gruas Daniele
 * Barrido de todas las pantallas: busca errores de javascript, respuestas 4xx y
 * 5xx, y pantallas de error. Lo recorre dos veces, con y sin filtro de empresa,
 * y ademas pide los tres PDF.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-todo.mjs
 *
 * Carga dos salidas de prueba de hoy: borralas despues.
 */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:3000'
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const MES = HOY.slice(0, 7)
let problemas = 0

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const errores = []
page.on('pageerror', (e) => errores.push(`js: ${String(e).slice(0, 140)}`))
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error' && !t.includes('ERR_CERT_AUTHORITY_INVALID') && !t.includes('fonts.googleapis')) {
    errores.push(`consola: ${t.slice(0, 140)}`)
  }
})

await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

// Un poco de data para que las pantallas no esten vacias.
async function guardar() {
  await page.click('form button:has-text("Guardar")')
  await page.waitForTimeout(900)
  if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
    await page.click('form button:has-text("Guardar igual")')
    await page.waitForTimeout(900)
  }
}
for (const d of [{ eq: 20, emp: 1, h: '07:00' }, { eq: 40, emp: 2, h: '08:00' }]) {
  await page.goto(`${BASE}/salidas/nueva?fecha=${HOY}`)
  await page.selectOption('select[name=equipoId]', { index: d.eq })
  await page.selectOption('select[name=empresaId]', { index: d.emp })
  await page.fill('input[name=horaSalida]', d.h)
  await page.fill('input[name=cliente]', 'Cliente QA')
  await page.selectOption('select[name=personalId]', { index: 1 })
  await guardar()
}

const rutas = [
  '/', '/salidas', `/salidas?fecha=${HOY}`, '/salidas/nueva',
  '/livianos', `/livianos?fecha=${HOY}`,
  '/calendario', '/calendario?vista=mes', '/calendario?vista=dia',
  '/checklists', '/guardias',
  '/maestros', '/maestros/personal', '/maestros/personal/nuevo',
  '/maestros/equipos', '/maestros/equipos/nuevo',
  '/maestros/empresas', '/maestros/empresas/nuevo',
  '/maestros/clientes', '/maestros/clientes/nuevo',
  '/maestros/lugares', '/maestros/lugares/nuevo',
  '/maestros/usuarios', '/maestros/usuarios/nuevo',
  '/auditoria', '/auditoria?accion=alta', `/auditoria?desde=${HOY}&hasta=${HOY}`,
  '/herramientas', '/herramientas?donde=persona', '/herramientas?sinConfirmar=on',
  '/herramientas/nueva', '/herramientas/entregar',
  '/salidas/buscar', '/salidas/buscar?q=GDU', '/salidas/buscar?q=zzz-nada',
]

async function barrer(rotulo) {
  console.log(`\n── ${rotulo} ──`)
  for (const ruta of rutas) {
    errores.length = 0
    const r = await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(250)
    // innerText y no textContent: textContent arrastra el payload de React y
    // los estilos, donde "500" aparece como peso de fuente.
    const visible = await page.evaluate(() => document.body.innerText)
    const roto = /No se pudo mostrar|Application error|Internal Server Error|This page could not be found/.test(visible)
    const estado = r.status()
    if (estado >= 400 || roto || errores.length > 0) {
      problemas++
      console.log(`  PROBLEMA ${ruta} -> HTTP ${estado}${roto ? ' (pantalla de error)' : ''} ${errores.join(' | ')}`)
    } else {
      console.log(`  ok  ${ruta}`)
    }
  }
}

await barrer('sin filtro de empresa')

// Con una sola empresa elegida.
await page.goto(`${BASE}/`)
await page.click('summary')
await page.waitForTimeout(300)
const casillas = page.locator('form input[name=empresa]')
const n = await casillas.count()
for (let i = 1; i < n; i++) await casillas.nth(i).uncheck()
await page.click('form button:has-text("Aplicar")')
await page.waitForTimeout(2000)
await barrer('con una empresa elegida')

// Los PDF.
console.log('\n── PDFs ──')
for (const [ruta, nombre] of [
  [`/api/pdf/dia/${HOY}`, 'parte del día'],
  [`/api/pdf/livianos/${HOY}`, 'livianos del día'],
  [`/api/pdf/livianos/mes/${MES}`, 'livianos del mes'],
]) {
  const r = await ctx.request.get(`${BASE}${ruta}`, { timeout: 90000 })
  const b = await r.body()
  const bien = r.status() === 200 && b.subarray(0, 5).toString() === '%PDF-'
  if (!bien) problemas++
  console.log(`  ${bien ? 'ok ' : 'PROBLEMA'} ${nombre} (HTTP ${r.status()}, ${(b.length / 1024).toFixed(0)} kB)`)
}

await nav.close()
console.log(problemas === 0 ? '\n  sin problemas\n' : `\n  ${problemas} problemas\n`)
process.exit(problemas === 0 ? 0 : 1)

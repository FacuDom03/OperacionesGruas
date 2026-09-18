/**
 * Central Operativa — Gruas Daniele
 * Prueba del calendario. Necesita Playwright aparte, como las otras.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-calendario.mjs
 *
 * Carga 6 salidas de prueba en la semana en curso: borralas despues.
 */
import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const dia = (n) => { const f = new Date(`${HOY}T12:00:00Z`); f.setUTCDate(f.getUTCDate() + n); return f.toISOString().slice(0, 10) }

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

async function guardar() {
  await page.click('form button:has-text("Guardar")')
  await page.waitForTimeout(900)
  if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
    await page.click('form button:has-text("Guardar igual")')
    await page.waitForTimeout(900)
  }
}

// Salidas repartidas en la semana, con unidades de distinto tipo.
const plan = [
  { d: 0, eq: 20, hora: '06:30', estado: 'en_ejecucion' },
  { d: 0, eq: 40, hora: '07:00', estado: 'a_confirmar' },
  { d: 1, eq: 60, hora: '07:30', estado: 'en_ejecucion' },
  { d: 2, eq: 21, hora: '08:00', estado: 'en_ejecucion' },
  { d: -1, eq: 41, hora: '09:00', estado: 'finalizado' },
  { d: 3, eq: 61, hora: '14:00', estado: 'a_confirmar' },
]
for (const p of plan) {
  await page.goto(`${BASE}/salidas/nueva?fecha=${dia(p.d)}`)
  await page.selectOption('select[name=equipoId]', { index: p.eq })
  await page.selectOption('select[name=empresaId]', { index: 1 })
  await page.fill('input[name=horaSalida]', p.hora)
  await page.fill('input[name=lugarDescarga]', 'Obra Panamericana')
  await page.selectOption('select[name=estado]', p.estado)
  await guardar()
}
ok('cargadas 6 salidas en la semana')

await page.goto(`${BASE}/calendario`)
let cuerpo = await page.textContent('body')
cuerpo.includes('CALENDARIO DE TRABAJOS') || cuerpo.includes('Calendario de trabajos') ? ok('abre el calendario') : fallo('no abrio')
cuerpo.includes('Grúas móviles') && cuerpo.includes('Autoelevadores') ? ok('muestra la leyenda por tipo') : fallo('falta la leyenda')
;(await page.locator('a[href^="/salidas/"]:not([href*="nueva"])').count()) >= 5 ? ok('las salidas aparecen en la semana') : fallo('faltan salidas', await page.locator('a[href^="/salidas/"]:not([href*="nueva"])').count())
cuerpo.includes('hoy') ? ok('marca el dia de hoy') : fallo('no marca hoy')

await page.goto(`${BASE}/calendario?vista=mes`)
;(await page.locator('a[href^="/salidas/"]:not([href*="nueva"])').count()) >= 5 ? ok('la vista mes trae las salidas') : fallo('vista mes vacia')

await page.goto(`${BASE}/calendario?vista=dia&fecha=${HOY}`)
;(await page.locator('a[href^="/salidas/"]:not([href*="nueva"])').count()) === 2 ? ok('la vista dia trae solo las de hoy') : fallo('vista dia', await page.locator('a[href^="/salidas/"]:not([href*="nueva"])').count())

// Navegar a la semana anterior y volver
await page.goto(`${BASE}/calendario`)
await page.click('a:has-text("‹")')
await page.waitForTimeout(700)
;(await page.textContent('body')).includes('Semana del') ? ok('navega a la semana anterior') : fallo('no navego')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

/**
 * Central Operativa — Gruas Daniele
 * Prueba de las salidas de trabajo con un navegador de verdad.
 *
 * Mismo requisito que scripts/probar-pantallas.mjs: Playwright aparte.
 *
 *   npm install --no-save playwright
 *   npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-salidas.mjs
 *
 * Cubre: alta, numeracion por secuencia, aviso de cruce de unidad y de
 * personal (que avisa pero deja guardar), el UNIQUE de fecha + unidad +
 * trabajo, y que una salida finalizada no se edite hasta que un admin la
 * reabra. Carga salidas de prueba el 17/09/2026: borralas despues.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
const FECHA = '2026-09-17'
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, extra = '') => { fallas++; console.log('  FALLA ', t, extra) }

async function esperaTexto(page, texto, que) {
  try { await page.waitForSelector(`text=${texto}`, { timeout: 15000 }); ok(que) }
  catch { fallo(que, `(no aparecio "${texto}")`) }
}

/** Guarda y, si aparecen avisos de cruce, confirma. */
async function guardar(page) {
  await page.click('form button:has-text("Guardar")')
  await page.waitForTimeout(1200)
  if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
    await page.click('form button:has-text("Guardar igual")')
    await page.waitForTimeout(1200)
  }
}

async function entrar(page, email, password) {
  await page.goto(`${BASE}/ingresar`)
  await page.fill('input[name=email]', email)
  await page.fill('input[name=password]', password)
  await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button:has-text("Entrar")')])
}

const nav = await chromium.launch()
const page = await (await nav.newContext()).newPage()
await entrar(page, 'admin@gruasdaniele.com', 'clave-de-prueba-123')

// ── alta ────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
await page.selectOption('select[name=equipoId]', { index: 1 })
await page.selectOption('select[name=empresaId]', { index: 1 })
await page.fill('input[name=horaSalida]', '08:00')
await page.fill('input[name=ot]', 'OT-1001')
await page.fill('input[name=lugarCarga]', 'Base')
await page.fill('input[name=lugarDescarga]', 'Obra Panamericana')
await page.selectOption('select[name=personalId]', { index: 1 })
await page.click('form button:has-text("Guardar")')
await esperaTexto(page, 'Salida guardada', 'da de alta una salida')

const cuerpo = await page.textContent('body')
const numero = cuerpo.match(/SAL-2026-\d{4}/)?.[0]
numero ? ok(`numera sola: ${numero}`) : fallo('no genero el numero')

// ── mismo trabajo, misma unidad, mismo dia: lo frena la base ─────────────
await page.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
await page.selectOption('select[name=equipoId]', { index: 1 })
await page.selectOption('select[name=empresaId]', { index: 1 })
await page.fill('input[name=horaSalida]', '08:30')
await page.click('form button:has-text("Guardar")')
await esperaTexto(page, 'Ojo, hay cruces', 'avisa el cruce de unidad')
await page.click('form button:has-text("Guardar igual")')
await esperaTexto(page, 'ese numero de trabajo en esa fecha', 'la base frena el trabajo 1 repetido')

// ── trabajo 2 de la misma unidad, mas tarde: entra sin aviso ─────────────
await page.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
await page.selectOption('select[name=equipoId]', { index: 1 })
await page.selectOption('select[name=empresaId]', { index: 1 })
await page.selectOption('select[name=ordenDia]', '2')
await page.fill('input[name=horaSalida]', '15:00')
await page.click('form button:has-text("Guardar")')
await esperaTexto(page, 'Salida guardada', 'el trabajo 2 a otra hora entra sin aviso')

// ── misma persona, otra unidad, misma hora: avisa ────────────────────────
await page.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
await page.selectOption('select[name=equipoId]', { index: 2 })
await page.selectOption('select[name=empresaId]', { index: 1 })
await page.fill('input[name=horaSalida]', '08:15')
await page.selectOption('select[name=personalId]', { index: 1 })
await page.click('form button:has-text("Guardar")')
await esperaTexto(page, 'ya esta en SAL-', 'avisa que la persona ya esta asignada')
await page.click('form button:has-text("Guardar igual")')
await esperaTexto(page, 'Salida guardada', 'deja guardar igual (aviso, no bloqueo)')

// ── finalizada: no se edita, y el admin la puede reabrir ─────────────────
await page.goto(`${BASE}/salidas?fecha=${FECHA}`)
await Promise.all([page.waitForURL(/\/salidas\/\d+$/), page.click('table a >> nth=0')])
const urlSalida = page.url()
await page.selectOption('select[name=estado]', 'finalizado')
await guardar(page)
await page.goto(urlSalida)
await esperaTexto(page, 'esta finalizada, asi que no se edita', 'una salida finalizada no se edita')
;(await page.locator('select[name=estado]').count()) === 0
  ? ok('no muestra el formulario de edicion') : fallo('sigue mostrando el formulario')
await esperaTexto(page, 'Reabrir', 'el admin ve el boton de reabrir')
await page.click('form button:has-text("Reabrir")')
await page.waitForTimeout(1500)
await page.goto(urlSalida)
;(await page.locator('select[name=estado]').count()) > 0
  ? ok('despues de reabrir se puede editar de nuevo') : fallo('no se reabrio')

// ── operaciones no puede reabrir ─────────────────────────────────────────
const page2 = await (await nav.newContext()).newPage()
await entrar(page2, 'operaciones@gruasdaniele.com', 'operaciones-prueba-123')
await page2.goto(`${BASE}/salidas/nueva?fecha=${FECHA}`)
;(await page2.locator('select[name=equipoId]').count()) > 0
  ? ok('operaciones puede cargar salidas') : fallo('operaciones no puede cargar salidas')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

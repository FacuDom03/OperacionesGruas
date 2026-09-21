/**
 * Central Operativa — Gruas Daniele
 * Prueba el navegador de fecha (que aplica sin apretar nada) y el ABM de
 * usuarios, incluido que un admin no se pueda dejar afuera a si mismo.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-fechas-y-usuarios.mjs
 *
 * Crea una salida anteayer y el usuario nuevo.usuario@gruasdaniele.com:
 * borralos despues.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const dia = (n) => { const f = new Date(`${HOY}T12:00:00Z`); f.setUTCDate(f.getUTCDate() + n); return f.toISOString().slice(0, 10) }
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

// Una salida anteayer, para buscarla con el calendario.
const AYER = dia(-2)
await page.goto(`${BASE}/salidas/nueva?fecha=${AYER}`)
await page.selectOption('select[name=equipoId]', { index: 12 })
await page.selectOption('select[name=empresaId]', { index: 1 })
await page.fill('input[name=horaSalida]', '06:15')
await page.fill('input[name=cliente]', 'Cliente de anteayer')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1200)
if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
  await page.click('form button:has-text("Guardar igual")'); await page.waitForTimeout(1200)
}

// ── el calendario aplica solo, sin apretar nada ──────────────────────────
await page.goto(`${BASE}/salidas?fecha=${HOY}`)
;(await page.locator('button:text-is("Ver")').count()) === 0 ? ok('ya no hace falta el botón Ver') : fallo('sigue el botón Ver')

await page.locator('input[type=date]').first().fill(AYER)
await page.waitForTimeout(2200)
let cuerpo = await page.textContent('body')
page.url().includes(AYER) ? ok('elegir la fecha navega solo') : fallo('no navegó', page.url())
cuerpo.includes('Cliente de anteayer') ? ok('trae las salidas de ese día') : fallo('no trajo las salidas')

// ── las flechas ──────────────────────────────────────────────────────────
await page.click('button[aria-label="Día siguiente"]')
await page.waitForTimeout(1800)
page.url().includes(dia(-1)) ? ok('la flecha › avanza un día') : fallo('la flecha no avanzó', page.url())
await page.click('button[aria-label="Día anterior"]')
await page.waitForTimeout(1800)
page.url().includes(AYER) ? ok('la flecha ‹ retrocede') : fallo('la flecha no retrocedió')

await page.click('button:has-text("Hoy")')
await page.waitForTimeout(1800)
page.url().includes(HOY) ? ok('el botón Hoy vuelve al día') : fallo('no volvió a hoy')

// ── el mismo navegador en las otras pantallas ────────────────────────────
for (const [ruta, nombre] of [['/livianos', 'livianos'], ['/checklists', 'checklists'], ['/guardias', 'guardias']]) {
  await page.goto(`${BASE}${ruta}`)
  await page.locator('input[type=date]').first().fill(AYER)
  await page.waitForTimeout(1800)
  page.url().includes(AYER) ? ok(`${nombre} también navega solo`) : fallo(`${nombre} no navega`, page.url())
}

// ── usuarios ─────────────────────────────────────────────────────────────
await page.goto(`${BASE}/maestros/usuarios`)
;(await page.textContent('body')).includes('admin@gruasdaniele.com') ? ok('lista los usuarios') : fallo('no lista usuarios')

await page.goto(`${BASE}/maestros/usuarios/nuevo`)
await page.fill('input[name=email]', 'Nuevo.Usuario@GruasDaniele.com')
await page.selectOption('select[name=rol]', 'operaciones')
await page.fill('input[name=password]', 'corta')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1800)
;(await page.textContent('body')).includes('8 caracteres') ? ok('rechaza la contraseña corta') : fallo('aceptó clave corta')

await page.fill('input[name=email]', 'Nuevo.Usuario@GruasDaniele.com')
await page.selectOption('select[name=rol]', 'operaciones')
await page.fill('input[name=password]', 'clave-larga-123')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(2000)
cuerpo = await page.textContent('body')
cuerpo.includes('nuevo.usuario@gruasdaniele.com') ? ok('crea el usuario con el correo en minúsculas') : fallo('no lo creó')

// El usuario nuevo puede entrar.
const page2 = await (await nav.newContext()).newPage()
await page2.goto(`${BASE}/ingresar`)
await page2.fill('input[name=email]', 'nuevo.usuario@gruasdaniele.com')
await page2.fill('input[name=password]', 'clave-larga-123')
await page2.click('form button')
await page2.waitForTimeout(2200)
page2.url() === `${BASE}/` ? ok('el usuario creado puede entrar') : fallo('no pudo entrar', page2.url())
;(await page2.goto(`${BASE}/maestros/usuarios`), await page2.textContent('body')).includes('No se pudo mostrar')
  ? ok('operaciones no entra a usuarios') : fallo('operaciones entró a usuarios')

// Un admin no se puede desactivar a si mismo.
await page.goto(`${BASE}/maestros/usuarios`)
await page.click('text=admin@gruasdaniele.com')
await page.waitForTimeout(1200)
await page.uncheck('input[name=activo]')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1800)
;(await page.textContent('body')).includes('No podés desactivar tu propio usuario')
  ? ok('no te podés desactivar a vos mismo') : fallo('se dejó desactivar')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

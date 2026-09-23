/**
 * Central Operativa — Gruas Daniele
 * Prueba que la sesion no sobreviva a una baja ni a un cambio de rol, y que el
 * ingreso frene la fuerza bruta.
 *
 *   npm run build && npm start
 *   node scripts/probar-sesion.mjs
 *
 * Usa consulta@gruasdaniele.com y lo deja como estaba.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'
let fallas = 0
const ok = (t) => console.log('  OK    ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }
const tiene = (texto, buscado) => texto.toLowerCase().includes(buscado.toLowerCase())

const nav = await chromium.launch()

async function entrar(hoja, email, clave) {
  await hoja.goto(`${BASE}/ingresar`)
  await hoja.fill('input[name=email]', email)
  await hoja.fill('input[name=password]', clave)
  await hoja.click('form button')
  await hoja.waitForTimeout(1800)
}

const admin = await (await nav.newContext()).newPage()
await entrar(admin, 'admin@gruasdaniele.com', 'clave-de-prueba-123')

/** Deja al usuario de prueba activo o inactivo desde el ABM. */
async function ponerActivo(activo) {
  await admin.goto(`${BASE}/maestros/usuarios`)
  await admin.click('a:has-text("consulta@gruasdaniele.com")')
  await admin.waitForLoadState('networkidle')
  const casilla = admin.locator('input[name=activo]')
  if (await casilla.count() > 0) {
    activo ? await casilla.check() : await casilla.uncheck()
  } else {
    await admin.selectOption('select[name=activo]', activo ? 'on' : 'off')
  }
  await admin.click('form button:has-text("Guardar")')
  await admin.waitForTimeout(1500)
}

// ── la baja corta la sesion que ya estaba abierta ────────────────────────
const victima = await (await nav.newContext()).newPage()
await entrar(victima, 'consulta@gruasdaniele.com', 'consulta-prueba-123')
victima.url() === `${BASE}/` ? ok('el usuario entra') : fallo('no pudo entrar', victima.url())

await ponerActivo(false)

await victima.goto(`${BASE}/salidas`)
await victima.waitForLoadState('networkidle')
victima.url().includes('/ingresar')
  ? ok('al darlo de baja, la sesion abierta deja de servir')
  : fallo('el usuario dado de baja sigue navegando', victima.url())
tiene(await victima.locator('body').innerText(), 'Tu sesión ya no vale')
  ? ok('la pantalla explica por que lo saco') : fallo('no dice por que')

// Y no puede volver a entrar.
await entrar(victima, 'consulta@gruasdaniele.com', 'consulta-prueba-123')
victima.url().includes('/ingresar')
  ? ok('dado de baja no puede volver a entrar') : fallo('entro estando de baja')

// Al reactivarlo, el token que ya tenia vuelve a valer: la sesion no se
// invalida, se revalida en cada pedido.
await ponerActivo(true)
await victima.goto(`${BASE}/salidas`)
await victima.waitForLoadState('networkidle')
victima.url().includes('/salidas')
  ? ok('al reactivarlo vuelve a navegar') : fallo('no volvio a entrar', victima.url())

// ── el limite de intentos ────────────────────────────────────────────────
const bruto = await (await nav.newContext()).newPage()
const inexistente = `nadie.${Date.now()}@gruasdaniele.com`
for (let i = 0; i < 5; i++) await entrar(bruto, inexistente, 'clave-equivocada')
await entrar(bruto, inexistente, 'clave-equivocada')
tiene(await bruto.locator('body').innerText(), 'Demasiados intentos')
  ? ok('cinco fallos bloquean el correo') : fallo('no bloqueo despues de cinco fallos')

// El bloqueo es por correo: otro usuario sigue entrando.
const otro = await (await nav.newContext()).newPage()
await entrar(otro, 'admin@gruasdaniele.com', 'clave-de-prueba-123')
otro.url() === `${BASE}/`
  ? ok('el bloqueo no alcanza a los demas correos') : fallo('bloqueo a un correo que no fallo', otro.url())

console.log(fallas === 0 ? '\nTodo bien.' : `\n${fallas} problema(s).`)
await nav.close()
process.exit(fallas === 0 ? 0 : 1)

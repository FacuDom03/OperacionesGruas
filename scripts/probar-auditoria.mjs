/**
 * Central Operativa — Gruas Daniele
 * Prueba el registro de cambios: que quede la linea de cada escritura, que los
 * filtros apliquen solos, que el detalle muestre el antes y el despues, y que
 * un rol que no sea admin no pueda entrar.
 *
 *   npm run build && npm start
 *   node scripts/probar-auditoria.mjs
 *
 * Le cambia el nombre al primer lugar y se lo deja como estaba.
 *
 * Ojo con el texto: los titulos y las pastillas llevan la clase .hdg, que los
 * pone en mayuscula. innerText devuelve lo que se ve, asi que las busquedas
 * van sin distinguir mayusculas.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'
let fallas = 0
const ok = (t) => console.log('  OK    ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }
const tiene = (texto, buscado) => texto.toLowerCase().includes(buscado.toLowerCase())

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

async function entrar(hoja, email, clave = 'clave-de-prueba-123') {
  await hoja.goto(`${BASE}/ingresar`)
  await hoja.fill('input[name=email]', email)
  await hoja.fill('input[name=password]', clave)
  await Promise.all([hoja.waitForURL(`${BASE}/`), hoja.click('form button')])
}

/** El texto de la tabla, sin los desplegables del filtro. */
const tabla = (hoja) => hoja.locator('table').first().innerText()

await entrar(page, 'admin@gruasdaniele.com')

// ── se genera una edicion de verdad, para tener que mirar ────────────────
await page.goto(`${BASE}/maestros/lugares`)
await page.locator('table a').first().click()
await page.waitForLoadState('networkidle')
// La lista muestra el codigo, no el nombre: para volver atras hace falta la URL.
const fichaDelLugar = page.url()
const campoNombre = page.locator('input[name=nombre]')
const nombreOriginal = await campoNombre.inputValue()
await campoNombre.fill('Lugar de prueba')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1500)

// ── el listado ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/auditoria`)
await page.waitForLoadState('networkidle')
let cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'Registro de cambios') ? ok('abre el registro de cambios') : fallo('no abrio la pantalla')

let filas = await tabla(page)
tiene(filas, 'Lugar #') ? ok('aparece la entidad que se toco') : fallo('no aparece el lugar', filas.slice(0, 200))
tiene(filas, 'Edición') ? ok('la marca como edicion') : fallo('no dice edicion')
tiene(filas, 'admin@gruasdaniele.com') ? ok('muestra quien la hizo') : fallo('no muestra el usuario')
tiene(filas, 'Nombre') ? ok('resume el campo que cambio') : fallo('no resume el campo', filas.slice(0, 400))
const FORMATO_FECHA = /\d{2}\/\d{2}\/\d{4},? \d{2}:\d{2}/
FORMATO_FECHA.test(filas)
  ? ok('la fecha sale en dd/mm/aaaa HH:mm')
  : fallo('formato de fecha raro', filas.slice(0, 120))

// ── guardar sin cambiar nada no deja linea ───────────────────────────────
const lineasAntes = await page.locator('table tbody tr').count()
await page.goto(fichaDelLugar)
await page.waitForLoadState('networkidle')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1500)
await page.goto(`${BASE}/auditoria`)
await page.waitForLoadState('networkidle')
await page.locator('table tbody tr').count() === lineasAntes
  ? ok('guardar sin cambiar nada no deja linea')
  : fallo('registro una edicion vacia')

// ── el detalle ───────────────────────────────────────────────────────────
await Promise.all([
  page.waitForURL(/\/auditoria\/\d+/),
  page.locator('main a:has-text("Ver detalle")').first().click(),
])
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'Qué cambió') ? ok('el detalle dice que cambio') : fallo('no abrio el detalle', page.url())
tiene(cuerpo, 'Lugar de prueba') ? ok('muestra el valor nuevo') : fallo('no muestra el valor nuevo')
tiene(cuerpo, nombreOriginal) ? ok('muestra el valor anterior') : fallo('no muestra el valor anterior', nombreOriginal)
tiene(cuerpo, 'passwordHash') ? fallo('filtra el hash de la contrasena') : ok('no filtra el hash de contrasenas')

// ── los filtros aplican solos ────────────────────────────────────────────
await page.goto(`${BASE}/auditoria`)
await page.waitForLoadState('networkidle')
const totalSinFiltro = await page.locator('table tbody tr').count()

await page.selectOption('select >> nth=1', 'alta')   // Accion = Alta
await page.waitForURL(/accion=alta/, { timeout: 5000 }).then(
  () => ok('el filtro navega solo, sin boton'),
  () => fallo('el filtro no aplico', page.url()),
)
await page.waitForLoadState('networkidle')
if (await page.locator('table tbody tr').count() > 0) {
  filas = await tabla(page)
  tiene(filas, 'Edición') ? fallo('el filtro de accion no filtro') : ok('el filtro de accion deja solo las altas')
} else {
  ok('el filtro de accion deja solo las altas')
}

// Un rango de fechas que no puede tener nada.
await page.goto(`${BASE}/auditoria?desde=2020-01-01&hasta=2020-01-02`)
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'No hay movimientos con esos filtros') ? ok('el rango de fechas filtra') : fallo('el rango de fechas no filtro')

// "Hasta" tiene que incluir el dia entero, no cortar a la medianoche.
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
await page.goto(`${BASE}/auditoria?desde=${HOY}&hasta=${HOY}`)
await page.waitForLoadState('networkidle')
await page.locator('table tbody tr').count() > 0
  ? ok('el dia de hoy entra en el rango')
  : fallo('hasta no incluye el dia entero')

await page.goto(`${BASE}/auditoria?accion=alta`)
await page.waitForLoadState('networkidle')
await page.click('button:has-text("Limpiar filtros")')
await page.waitForTimeout(1500)
const trasLimpiar = await page.locator('table tbody tr').count()
trasLimpiar === totalSinFiltro ? ok('limpiar filtros vuelve a todo') : fallo('limpiar filtros dejo otra cosa', `${trasLimpiar} de ${totalSinFiltro}`)

// ── el enlace a la ficha ─────────────────────────────────────────────────
await page.goto(`${BASE}/auditoria?entidad=lugares`)
await page.waitForLoadState('networkidle')
const enlace = page.locator('table a', { hasText: 'Lugar #' }).first()
if (await enlace.count() > 0) {
  await Promise.all([page.waitForURL(/\/maestros\/lugares\/\d+/), enlace.click()])
  ok('el enlace lleva a la ficha')
} else {
  fallo('no hay enlace a la ficha del lugar', await tabla(page))
}

// ── se ve desde maestros ─────────────────────────────────────────────────
await page.goto(`${BASE}/maestros`)
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'Registro de cambios') ? ok('maestros linkea el registro') : fallo('maestros no linkea el registro')
tiene(cuerpo, 'Guardias') ? ok('maestros linkea las guardias') : fallo('maestros no linkea las guardias')
tiene(cuerpo, 'Usuarios') ? ok('maestros linkea los usuarios') : fallo('maestros no linkea los usuarios')

// ── un rol que no es admin no entra ──────────────────────────────────────
const espia = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await entrar(espia, 'consulta@gruasdaniele.com', 'consulta-prueba-123')
await espia.goto(`${BASE}/auditoria`)
await espia.waitForLoadState('networkidle')
const cuerpoEspia = await espia.locator('body').innerText()
tiene(cuerpoEspia, 'Cuándo') ? fallo('un rol consulta entro al registro') : ok('un rol consulta no ve el registro')
await espia.goto(`${BASE}/maestros`)
await espia.waitForLoadState('networkidle')
const maestrosEspia = await espia.locator('main').innerText()
tiene(maestrosEspia, 'Registro de cambios') ? fallo('consulta ve el enlace al registro') : ok('consulta no ve el enlace')
tiene(maestrosEspia, 'Usuarios') ? fallo('consulta ve el enlace a usuarios') : ok('consulta no ve el enlace a usuarios')

// ── se deja el lugar como estaba ─────────────────────────────────────────
await page.goto(fichaDelLugar)
await page.waitForLoadState('networkidle')
await page.locator('input[name=nombre]').fill(nombreOriginal)
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1200)

console.log(fallas === 0 ? '\nTodo bien.' : `\n${fallas} problema(s).`)
await nav.close()
process.exit(fallas === 0 ? 0 : 1)

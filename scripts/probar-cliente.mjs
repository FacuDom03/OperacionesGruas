/**
 * Central Operativa — Gruas Daniele
 * Prueba del campo de cliente: texto libre con sugerencias, que da de alta en
 * el maestro lo que no existe.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-cliente.mjs
 *
 * Carga salidas y un cliente de prueba ("Techint SA"): borralos despues.
 */
import { chromium } from 'playwright'
import { diaLibre } from './dia-libre.mjs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
// Las salidas de prueba van a un dia libre: hoy puede tener cargadas las de
// otra corrida y el UNIQUE de fecha + unidad + trabajo las rebotaria.
let HOY
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

const nav = await chromium.launch()
const page = await (await nav.newContext({ viewport: { width: 1440, height: 1000 } })).newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

HOY = await diaLibre(page, BASE)
console.log(`  (dia de prueba: ${HOY})`)

async function guardar() {
  await page.click('form button:has-text("Guardar")')
  await page.waitForTimeout(1100)
  if (await page.locator('form button:has-text("Guardar igual")').count() > 0) {
    await page.click('form button:has-text("Guardar igual")')
    await page.waitForTimeout(1100)
  }
}

async function cargarSalida({ eq, hora, cliente }) {
  await page.goto(`${BASE}/salidas/nueva?fecha=${HOY}`)
  await page.selectOption('select[name=equipoId]', { index: eq })
  await page.selectOption('select[name=empresaId]', { index: 1 })
  await page.fill('input[name=horaSalida]', hora)
  if (cliente !== undefined) await page.fill('input[name=cliente]', cliente)
  await guardar()
}

// El campo es de texto, no un desplegable cerrado.
await page.goto(`${BASE}/salidas/nueva?fecha=${HOY}`)
const campo = page.locator('input[name=cliente]')
await campo.count() === 1 ? ok('el cliente es un campo de texto') : fallo('sigue siendo desplegable')
await page.locator('#clientes-conocidos').count() === 1 ? ok('tiene lista de sugerencias') : fallo('falta la datalist')

// Un cliente nuevo se da de alta solo.
await cargarSalida({ eq: 3, hora: '07:00', cliente: 'Techint SA' })
await page.goto(`${BASE}/maestros/clientes`)
;(await page.textContent('body')).includes('Techint SA')
  ? ok('el cliente escrito quedó en el maestro') : fallo('no se guardó en el maestro')

// Escrito distinto, no duplica.
await cargarSalida({ eq: 4, hora: '09:00', cliente: '  techint sa ' })
await page.goto(`${BASE}/maestros/clientes`)
// Filas de la tabla, no texto suelto: el <body> incluye el payload de React y
// cuenta de mas.
const filas = await page.locator('table tbody tr').filter({ hasText: /techint/i }).count()
filas === 1 ? ok('escrito con otras mayúsculas no duplica') : fallo('duplicó el cliente', `${filas} filas`)

// Ahora aparece como sugerencia.
await page.goto(`${BASE}/salidas/nueva?fecha=${HOY}`)
;(await page.locator('#clientes-conocidos option').allTextContents()).length >= 0
const valores = await page.locator('#clientes-conocidos option').evaluateAll((os) => os.map((o) => o.value))
valores.includes('Techint SA') ? ok('aparece en las sugerencias') : fallo('no lo sugiere', valores.join('|'))

// Sin cliente se guarda igual.
await cargarSalida({ eq: 5, hora: '11:00' })
;(await page.textContent('body')).includes('Salida guardada')
  ? ok('se puede guardar sin cliente') : fallo('exige cliente')

// Al editar, el campo vuelve con el nombre cargado.
await page.goto(`${BASE}/salidas?fecha=${HOY}`)
await Promise.all([page.waitForURL(/\/salidas\/\d+$/), page.click('table a >> nth=0')])
const valor = await page.inputValue('input[name=cliente]')
valor.toLowerCase().includes('techint') ? ok(`al editar vuelve el cliente ("${valor}")`) : fallo('no repone el cliente', valor)

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

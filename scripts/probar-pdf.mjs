/**
 * Central Operativa — Gruas Daniele
 * Prueba de los PDF. Mismo requisito que los otros dos: Playwright aparte.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   node scripts/probar-pdf.mjs
 *
 * Espera salidas cargadas el 17/09/2026 (las deja scripts/probar-salidas.mjs).
 * Comprueba que /print se vea con sesion, que el endpoint devuelva un PDF de
 * verdad y que el parte del dia salga completo.
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3000'
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

// el numero de la primera salida del dia que se pida (por defecto, hoy)
const FECHA = process.env.FECHA ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
await page.goto(`${BASE}/salidas?fecha=${FECHA}`)
const numero = (await page.textContent('body')).match(/SAL-2026-\d{4}/)?.[0]
await Promise.all([page.waitForURL(/\/salidas\/\d+$/), page.click('table a >> nth=0')])
const id = page.url().split('/').pop()
ok(`salida ${numero} (id ${id})`)

// la pagina /print se ve con sesion
const r = await page.goto(`${BASE}/print/salida/${id}`)
r.status() === 200 ? ok('/print se ve con sesion') : fallo('/print con sesion', r.status())
const hoja = await page.textContent('body')
hoja.includes('Salida de trabajo') && hoja.includes(numero)
  ? ok('la hoja tiene la cabecera y el numero') : fallo('contenido de la hoja')
hoja.includes('Conformidad del cliente') ? ok('tiene las tres firmas') : fallo('faltan las firmas')

// ── las tipografias ──────────────────────────────────────────────────────
// Si no cargan, el PDF sale con la que el navegador tenga a mano y no se
// parece a la pantalla. Paso dos veces: una por el <link> a Google que no se
// podia resolver, y otra porque el middleware mandaba los .woff2 a /ingresar.
const woff = await ctx.request.get(`${BASE}/fuentes/ibm-plex-sans-variable.woff2`, { maxRedirects: 0 })
woff.status() === 200
  ? ok('las tipografias se sirven desde la app') : fallo('la tipografia no se sirve', woff.status())

// Las familias que el navegador termino bajando de verdad. No se usa
// fonts.check() porque responde por peso, y la hoja no usa todos los pesos.
await page.evaluate(() => document.fonts.ready)
const familias = await page.evaluate(() =>
  [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family))
const faltan = ['Barlow Condensed', 'IBM Plex Sans', 'IBM Plex Mono'].filter((f) => !familias.includes(f))
faltan.length === 0
  ? ok('la hoja carga las tres familias del mockup') : fallo('faltan tipografias', faltan.join(', '))

hoja.includes('Teléfono') && hoja.includes('Gestión')
  ? ok('los textos de la hoja van con tilde') : fallo('la hoja perdio los acentos')

// el PDF de la salida
const res = await ctx.request.get(`${BASE}/api/pdf/salida/${id}`, { timeout: 90000 })
const cuerpo = await res.body()
res.status() === 200 ? ok('el endpoint del PDF responde 200') : fallo('endpoint PDF', res.status())
res.headers()['content-type'] === 'application/pdf' ? ok('content-type application/pdf') : fallo('content-type', res.headers()['content-type'])
cuerpo.subarray(0, 5).toString() === '%PDF-' ? ok(`es un PDF de verdad (${(cuerpo.length / 1024).toFixed(0)} kB)`) : fallo('no empieza con %PDF-')
writeFileSync('salida.pdf', cuerpo)

// el parte del dia
const res2 = await ctx.request.get(`${BASE}/api/pdf/dia/${FECHA}`, { timeout: 90000 })
const cuerpo2 = await res2.body()
res2.status() === 200 && cuerpo2.subarray(0, 5).toString() === '%PDF-'
  ? ok(`el parte del dia sale en PDF (${(cuerpo2.length / 1024).toFixed(0)} kB)`) : fallo('parte del dia', res2.status())
writeFileSync('parte-del-dia.pdf', cuerpo2)

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

/**
 * Central Operativa — Gruas Daniele
 * Prueba de la ingesta y la pantalla de checklists.
 *
 *   npm install --no-save playwright && npx playwright install chromium
 *   npm run build && npm start
 *   CHECKLIST_API_KEY=<la de tu .env> node scripts/probar-checklists.mjs
 *
 * Manda checklists de prueba de hoy para GDU505 y GDU100: borralos despues.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
const CLAVE = process.env.CHECKLIST_API_KEY ?? 'cambiar-esto'
const HOY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }

async function mandar(cuerpo) {
  const r = await fetch(`${BASE}/api/checklists`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': CLAVE },
    body: JSON.stringify({ fecha: HOY, ...cuerpo }),
  })
  return { estado: r.status, cuerpo: await r.json().catch(() => null) }
}

// ── el endpoint ─────────────────────────────────────────────────────────
const conFalla = await mandar({
  interno: 'GDU505',
  telefono: '+54 9 11 5578-2210',
  items: [
    { item: 'Niveles de aceite', ok: true },
    { item: 'Neumáticos', ok: false, comentario: 'poca presión' },
  ],
  observaciones: 'Cubierta trasera derecha pierde aire.',
  adjuntos: [{ url: 'https://ejemplo/foto1.jpg', tipo: 'image/jpeg' }],
})
conFalla.estado === 200 && conFalla.cuerpo.resultado === 'con_observacion'
  ? ok('guarda un checklist con observación') : fallo('checklist con falla', JSON.stringify(conFalla))

const limpio = await mandar({ interno: 'GDU100', items: [{ item: 'Frenos', ok: true }] })
limpio.cuerpo?.resultado === 'sin_novedad' ? ok('guarda uno sin novedad') : fallo('sin novedad', JSON.stringify(limpio))

const repetido = await mandar({ interno: 'GDU505', items: [{ item: 'Frenos', ok: true }] })
repetido.cuerpo?.id === conFalla.cuerpo.id
  ? ok('el mismo equipo el mismo día actualiza, no duplica') : fallo('duplicó', JSON.stringify(repetido))
repetido.cuerpo?.resultado === 'sin_novedad'
  ? ok('al reenviar sin fallas queda sin novedad') : fallo('no recalculó el resultado')

const sinClave = await fetch(`${BASE}/api/checklists`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
})
sinClave.status === 401 ? ok('sin x-api-key responde 401') : fallo('dejó pasar sin clave', sinClave.status)

const fechaMal = await mandar({ interno: 'GDU505', fecha: 'ayer' })
fechaMal.estado === 400 ? ok('rechaza una fecha inválida') : fallo('aceptó fecha inválida', fechaMal.estado)

// ── la pantalla ─────────────────────────────────────────────────────────
const nav = await chromium.launch()
const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage()
await page.goto(`${BASE}/ingresar`)
await page.fill('input[name=email]', 'admin@gruasdaniele.com')
await page.fill('input[name=password]', 'clave-de-prueba-123')
await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button')])

await page.goto(`${BASE}/checklists?fecha=${HOY}`)
let cuerpo = await page.textContent('body')
cuerpo.includes('RESUMEN DE CHECKLISTS') || cuerpo.includes('Resumen de checklists') ? ok('abre la pantalla') : fallo('no abrió')
cuerpo.includes('GDU505') && cuerpo.includes('GDU100') ? ok('lista los dos recibidos') : fallo('faltan en la lista')

await page.click('text=GDU505')
await page.waitForTimeout(1200)
cuerpo = await page.textContent('body')
cuerpo.includes('Ítems verificados') && cuerpo.includes('Frenos')
  ? ok('el detalle muestra los ítems de la última carga') : fallo('sin ítems')
cuerpo.includes('Marcar como revisado') ? ok('ofrece marcar como revisado') : fallo('falta el botón de revisado')

await page.click('button:has-text("Marcar como revisado")')
await page.waitForTimeout(1500)
;(await page.textContent('body')).includes('Revisado el') ? ok('queda marcado como revisado') : fallo('no se marcó')

// consulta no puede marcar
const page2 = await (await nav.newContext()).newPage()
await page2.goto(`${BASE}/ingresar`)
await page2.fill('input[name=email]', 'consulta@gruasdaniele.com')
await page2.fill('input[name=password]', 'consulta-prueba-123')
await Promise.all([page2.waitForURL(`${BASE}/`), page2.click('form button')])
await page2.goto(`${BASE}/checklists?fecha=${HOY}`)
await page2.click('text=GDU100')
await page2.waitForTimeout(1200)
;(await page2.textContent('body')).includes('Marcar como revisado')
  ? fallo('consulta puede marcar revisado') : ok('consulta no puede marcar revisado')

await nav.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

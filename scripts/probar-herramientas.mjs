/**
 * Central Operativa — Gruas Daniele
 * Prueba el circuito completo de herramientas: alta, entrega, el link de
 * confirmacion, la devolucion y el historial.
 *
 *   npm run build && npm start
 *   node scripts/probar-herramientas.mjs
 *
 * Carga herramientas de prueba con codigos GDH90x: borralas despues.
 *
 * Ojo con el texto: los titulos y las pastillas llevan .hdg, que los pone en
 * mayuscula, asi que las busquedas van sin distinguir mayusculas.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:3000'
let fallas = 0
const ok = (t) => console.log('  OK    ', t)
const fallo = (t, e = '') => { fallas++; console.log('  FALLA ', t, e) }
const tiene = (texto, buscado) => texto.toLowerCase().includes(buscado.toLowerCase())

const nav = await chromium.launch()
const page = await (await nav.newContext({ viewport: { width: 1440, height: 900 } })).newPage()

async function entrar(hoja, email, clave) {
  await hoja.goto(`${BASE}/ingresar`)
  await hoja.fill('input[name=email]', email)
  await hoja.fill('input[name=password]', clave)
  await Promise.all([hoja.waitForURL(`${BASE}/`), hoja.click('form button')])
}

await entrar(page, 'admin@gruasdaniele.com', 'clave-de-prueba-123')

// ── el alta ──────────────────────────────────────────────────────────────
// La normalizacion del codigo se comprueba aparte, en npm test. Aca importa
// que el alta ande, y que correr esto dos veces no rompa nada.
const CODIGOS = ['GDH901', 'GDH902']
for (const [i, codigo] of CODIGOS.entries()) {
  await page.goto(`${BASE}/herramientas?texto=${codigo}`)
  await page.waitForLoadState('networkidle')
  if (tiene(await page.locator('main').innerText(), codigo)) continue   // quedo de otra corrida

  await page.goto(`${BASE}/herramientas/nueva`)
  await page.fill('input[name=codigo]', codigo.replace('GDH', ''))   // 901, no GDH901
  await page.fill('input[name=nombre]', `Herramienta de prueba ${i + 1}`)
  await page.fill('input[name=marca]', 'Marca Prueba')
  await page.selectOption('select[name=custodia]', { index: 1 })     // el primer lugar
  await page.click('form button:has-text("Guardar")')
  await page.waitForTimeout(1200)
}

await page.goto(`${BASE}/herramientas`)
await page.waitForLoadState('networkidle')
let cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'GDH901') && tiene(cuerpo, 'GDH902')
  ? ok('da de alta con el codigo normalizado') : fallo('no aparecen las dos', cuerpo.slice(0, 300))

// Sin custodia no se puede dar de alta.
await page.goto(`${BASE}/herramientas/nueva`)
await page.fill('input[name=codigo]', 'GDH903')
await page.fill('input[name=nombre]', 'Sin lugar')
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1200)
tiene(await page.locator('main').innerText(), 'donde esta la herramienta')
  ? ok('no deja dar de alta sin decir donde esta') : fallo('dejo pasar una sin custodia', page.url())

// Codigo repetido.
await page.goto(`${BASE}/herramientas/nueva`)
await page.fill('input[name=codigo]', 'GDH901')
await page.fill('input[name=nombre]', 'Repetida')
await page.selectOption('select[name=custodia]', { index: 1 })
await page.click('form button:has-text("Guardar")')
await page.waitForTimeout(1200)
tiene(await page.locator('main').innerText(), 'ya hay otra herramienta con ese codigo')
  ? ok('avisa el codigo repetido') : fallo('dejo duplicar el codigo')

// ── la entrega ───────────────────────────────────────────────────────────
await page.goto(`${BASE}/herramientas/entregar`)
await page.waitForLoadState('networkidle')
await page.fill('input[type=search]', 'GDH90')
await page.waitForTimeout(400)
const visibles = await page.locator('input[name=herramientas]').count()
visibles === 2 ? ok('el buscador filtra la lista de herramientas') : fallo('el buscador no filtro', String(visibles))

await page.locator('input[name=herramientas]').first().check()
await page.locator('input[name=herramientas]').nth(1).check()

// La primera persona del desplegable.
const valorPersona = await page.locator('select[name=destino] option[value^="persona:"]').first().getAttribute('value')
await page.selectOption('select[name=destino]', valorPersona)
await page.fill('input[name=observaciones]', 'Para la obra de Zarate')
await page.click('form button:has-text("Registrar entrega")')
await page.waitForURL(/\/herramientas\?/, { timeout: 15000 })
await page.waitForLoadState('networkidle')

cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'Entrega registrada') ? ok('registra la entrega') : fallo('no registro la entrega', cuerpo.slice(0, 200))

const link = await page.locator('main input[readonly]').first().inputValue()
const FORMATO_LINK = /\/confirmar\/[A-Za-z0-9_-]{20,}/
FORMATO_LINK.test(link) ? ok('devuelve el link de confirmacion') : fallo('link raro', link)

tiene(cuerpo, 'sin confirmar') ? ok('las marca como sin confirmar') : fallo('no dice sin confirmar')

// ── el formulario del empleado, sin sesion ───────────────────────────────
const ruta = link.slice(link.indexOf('/confirmar'))
const anonimo = await (await nav.newContext({ viewport: { width: 390, height: 844 } })).newPage()
await anonimo.goto(`${BASE}${ruta}`)
await anonimo.waitForLoadState('networkidle')
let cuerpoAnon = await anonimo.locator('main').innerText()
!anonimo.url().includes('/ingresar') ? ok('el link abre sin pedir sesion') : fallo('pidio sesion', anonimo.url())
tiene(cuerpoAnon, 'GDH901') && tiene(cuerpoAnon, 'GDH902')
  ? ok('el formulario lista las dos herramientas') : fallo('no lista las herramientas', cuerpoAnon.slice(0, 300))
tiene(cuerpoAnon, 'Para la obra de Zarate') ? ok('muestra la nota de la oficina') : fallo('falta la nota')

await anonimo.fill('textarea[name=nota]', 'Falta el cargador')
await anonimo.click('button:has-text("Confirmo")')
await anonimo.waitForTimeout(1800)
cuerpoAnon = await anonimo.locator('main').innerText()
tiene(cuerpoAnon, 'quedo confirmado') || tiene(cuerpoAnon, 'quedó confirmado')
  ? ok('el empleado confirma') : fallo('no confirmo', cuerpoAnon.slice(0, 200))

// Un token inventado no muestra nada de nadie.
const espia = await (await nav.newContext()).newPage()
await espia.goto(`${BASE}/confirmar/token-que-no-existe`)
await espia.waitForLoadState('networkidle')
const cuerpoEspia = await espia.locator('main').innerText()
tiene(cuerpoEspia, 'no sirve') && !tiene(cuerpoEspia, 'GDH901')
  ? ok('un token inventado no muestra nada') : fallo('el token inventado mostro algo', cuerpoEspia.slice(0, 200))

// ── ya confirmada ────────────────────────────────────────────────────────
await page.goto(`${BASE}/herramientas`)
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('table').innerText()
tiene(cuerpo, 'sin confirmar') ? fallo('sigue diciendo sin confirmar') : ok('deja de figurar como sin confirmar')

// ── el historial ─────────────────────────────────────────────────────────
await Promise.all([
  page.waitForURL(/\/herramientas\/\d+/),
  page.click('table a:has-text("GDH901")'),
])
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'Historial') ? ok('la ficha tiene historial') : fallo('sin historial')
tiene(cuerpo, 'Falta el cargador') ? ok('el historial guarda la nota del empleado') : fallo('perdio la nota')
tiene(cuerpo, 'La tiene') ? ok('la ficha dice quien la tiene') : fallo('no dice quien la tiene')

// ── la devolucion ────────────────────────────────────────────────────────
await page.goto(`${BASE}/herramientas/entregar`)
await page.waitForLoadState('networkidle')
await page.fill('input[type=search]', 'GDH901')
await page.waitForTimeout(400)
await page.locator('input[name=herramientas]').first().check()
const valorLugar = await page.locator('select[name=destino] option[value^="lugar:"]').first().getAttribute('value')
await page.selectOption('select[name=destino]', valorLugar)
await page.click('form button:has-text("Registrar entrega")')
await page.waitForURL(/\/herramientas\?/, { timeout: 15000 })
await page.waitForLoadState('networkidle')

cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'Entrega registrada') ? ok('registra la devolucion') : fallo('no registro la devolucion')
// A un lugar no se le manda link: un depósito no confirma nada.
await page.locator('main input[readonly]').count() === 0
  ? ok('una devolucion a un lugar no genera link') : fallo('genero link para un lugar')

await page.goto(`${BASE}/herramientas?texto=GDH901`)
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('table').innerText()
tiene(cuerpo, 'En ') ? ok('vuelve a figurar guardada en un lugar') : fallo('no volvio al lugar', cuerpo.slice(0, 200))

// ── los filtros ──────────────────────────────────────────────────────────
await page.goto(`${BASE}/herramientas?donde=persona`)
await page.waitForLoadState('networkidle')
cuerpo = await page.locator('main').innerText()
tiene(cuerpo, 'GDH902') && !tiene(cuerpo, 'GDH901')
  ? ok('el filtro por donde esta funciona') : fallo('el filtro por custodia no filtro')

await page.goto(`${BASE}/herramientas?texto=zzz-no-existe`)
await page.waitForLoadState('networkidle')
tiene(await page.locator('main').innerText(), 'No hay herramientas con esos filtros')
  ? ok('la busqueda sin resultados lo dice') : fallo('no avisa que no hay resultados')

// ── un rol consulta no mueve nada ────────────────────────────────────────
const mirona = await (await nav.newContext()).newPage()
await entrar(mirona, 'consulta@gruasdaniele.com', 'consulta-prueba-123')
await mirona.goto(`${BASE}/herramientas`)
await mirona.waitForLoadState('networkidle')
const cuerpoMirona = await mirona.locator('main').innerText()
tiene(cuerpoMirona, 'GDH902') ? ok('consulta ve el panel') : fallo('consulta no ve el panel')
await mirona.locator('main a[href="/herramientas/entregar"]').count() > 0
  ? fallo('consulta ve el boton de entregar') : ok('consulta no ve el boton de entregar')

await mirona.goto(`${BASE}/herramientas/entregar`)
await mirona.waitForLoadState('networkidle')
await mirona.waitForTimeout(500)
const textoMirona = await mirona.locator('main').innerText()
mirona.url().includes('/sin-permiso') && tiene(textoMirona, 'No podés entrar acá')
  ? ok('consulta cae en la pantalla de sin permiso') : fallo('consulta entro a entregar', mirona.url())
tiene(textoMirona, 'mover herramientas')
  ? ok('la pantalla dice que permiso le falta') : fallo('no dice el permiso')

console.log(fallas === 0 ? '\nTodo bien.' : `\n${fallas} problema(s).`)
await nav.close()
process.exit(fallas === 0 ? 0 : 1)

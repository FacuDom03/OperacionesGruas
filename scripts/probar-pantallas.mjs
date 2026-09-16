/**
 * Central Operativa — Gruas Daniele
 * Prueba de las pantallas con un navegador de verdad.
 *
 * No entra en `npm test` porque necesita Playwright, que no es dependencia del
 * proyecto (son ~300 MB con el navegador). Para correrla:
 *
 *   npm install --no-save playwright     # una sola vez
 *   npx playwright install chromium      # una sola vez
 *   npm run build && npm start           # en otra terminal, escucha en el 3000
 *   node scripts/probar-pantallas.mjs    # BASE=... si usas otro puerto
 *
 * Espera dos usuarios dados de alta con scripts/crear-usuario.ts:
 *   admin@gruasdaniele.com    / clave-de-prueba-123     (rol admin)
 *   consulta@gruasdaniele.com / consulta-prueba-123     (rol consulta)
 *
 * Deja la base como la encontro salvo el lugar PRUEBA y el telefono que carga.
 */
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://127.0.0.1:3000'
let fallas = 0
const ok = (t) => console.log('  OK   ', t)
const fallo = (t, extra = '') => { fallas++; console.log('  FALLA ', t, extra) }

async function esperaTexto(page, texto, que) {
  try {
    await page.waitForSelector(`text=${texto}`, { timeout: 15000 })
    ok(que)
  } catch {
    fallo(que, `(no aparecio "${texto}")`)
  }
}

async function entrar(page, email, password) {
  await page.goto(`${BASE}/ingresar`)
  await page.fill('input[name=email]', email)
  await page.fill('input[name=password]', password)
  await Promise.all([page.waitForURL(`${BASE}/`), page.click('form button:has-text("Entrar")')])
}

const navegador = await chromium.launch()

// ─── admin ───────────────────────────────────────────────────────────────
{
  const page = await (await navegador.newContext()).newPage()

  await page.goto(`${BASE}/maestros`)
  page.url().includes('/ingresar') ? ok('sin sesion, /maestros manda a ingresar') : fallo('no pidio sesion')

  await entrar(page, 'admin@gruasdaniele.com', 'clave-de-prueba-123')
  ok('entro el admin')

  await page.goto(`${BASE}/maestros/personal`)
  const texto = await page.textContent('body')
  texto.includes('55 personas') ? ok('la lista muestra 55 personas') : fallo('conteo de personal', texto.match(/\d+ personas/)?.[0])
  ;(await page.locator('text=Nueva persona').count()) > 0 ? ok('el admin ve el boton de alta') : fallo('falta boton de alta')

  // Telefono con el 15 y sin area: no se puede adivinar, tiene que frenar.
  await Promise.all([page.waitForURL(/\/maestros\/personal\/\d+$/), page.click('table a >> nth=0')])
  const urlPersona = page.url()
  const nombre = await page.inputValue('input[name=apellidoNombre]')
  await page.fill('input[name=telefonoWsp]', '15-5578-2210')
  await page.click('form button:has-text("Guardar")')
  await esperaTexto(page, 'Cloud API', 'rechaza el telefono sin codigo de area')

  // Telefono bien cargado: saca el 9 de Baileys y guarda.
  await page.goto(urlPersona)
  await page.fill('input[name=telefonoWsp]', '+54 9 11 5578-2210')
  await Promise.all([page.waitForURL(`${BASE}/maestros/personal`), page.click('form button:has-text("Guardar")')])
  await esperaTexto(page, '541155782210', `normaliza y guarda el telefono de ${nombre}`)

  // Alta de un lugar.
  await page.goto(`${BASE}/maestros/lugares/nuevo`)
  await page.fill('input[name=codigo]', 'PRUEBA')
  await page.fill('input[name=nombre]', 'Lugar de prueba')
  await page.click('form button:has-text("Guardar")')
  await esperaTexto(page, 'Lugar de prueba', 'da de alta un lugar')

  // Codigo repetido: avisa, no explota.
  await page.goto(`${BASE}/maestros/lugares/nuevo`)
  await page.fill('input[name=codigo]', 'PRUEBA')
  await page.fill('input[name=nombre]', 'Otro mas')
  await page.click('form button:has-text("Guardar")')
  await esperaTexto(page, 'Ya hay otro lugar con ese codigo', 'avisa el codigo repetido')

  // Interno mal escrito.
  await page.goto(`${BASE}/maestros/equipos/nuevo`)
  await page.fill('input[name=interno]', 'XX9')
  await page.fill('input[name=tipo]', 'Camion')
  await page.click('form button:has-text("Guardar")')
  await esperaTexto(page, 'no es un interno valido', 'rechaza el interno mal escrito')

  // "111" se normaliza a GDU111, que ya existe.
  await page.goto(`${BASE}/maestros/equipos/nuevo`)
  await page.fill('input[name=interno]', '111')
  await page.fill('input[name=tipo]', 'Camion')
  await page.click('form button:has-text("Guardar")')
  await esperaTexto(page, 'Ya hay otro equipo con ese interno', 'normaliza "111" a GDU111 y ve el duplicado')
}

// ─── consulta (solo lectura) ─────────────────────────────────────────────
{
  const page = await (await navegador.newContext()).newPage()
  await entrar(page, 'consulta@gruasdaniele.com', 'consulta-prueba-123')
  ok('entro el usuario de consulta')

  await page.goto(`${BASE}/maestros/personal`)
  ;(await page.locator('text=Nueva persona').count()) === 0
    ? ok('consulta no ve el boton de alta') : fallo('consulta ve el boton de alta')

  await page.goto(`${BASE}/maestros/personal/2`)
  const cuerpo = await page.textContent('body')
  cuerpo.includes('Guardar')
    ? fallo('consulta llego al formulario de edicion')
    : ok('consulta no puede abrir el formulario de edicion')
}

await navegador.close()
console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

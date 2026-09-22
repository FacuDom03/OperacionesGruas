/**
 * Central Operativa — Gruas Daniele
 * Baja las tres familias del mockup a public/fuentes/ y escribe el CSS con los
 * @font-face.
 *
 *   node scripts/bajar-fuentes.mjs
 *
 * Por que estan servidas por la app y no por Google: los PDF los arma Puppeteer
 * abriendo las rutas /print. Si en ese momento no se puede salir a internet, o
 * Google tarda, la hoja sale con la tipografia que el navegador tenga a mano y
 * el PDF no se parece a la pantalla. Sirviendolas nosotros, el PDF siempre es
 * el mismo.
 *
 * Solo el subconjunto latin: alcanza para el castellano y son 10 archivos.
 */
import { mkdir, writeFile } from 'node:fs/promises'

const DESTINO = 'public/fuentes'
const CSS = 'src/app/fuentes.css'

// Chrome pide woff2; con otro user-agent Google devuelve formatos viejos.
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

const FAMILIAS = [
  { nombre: 'Barlow Condensed', consulta: 'Barlow+Condensed:wght@500;600;700', archivo: 'barlow-condensed' },
  { nombre: 'IBM Plex Sans', consulta: 'IBM+Plex+Sans:wght@400;500;600;700', archivo: 'ibm-plex-sans' },
  { nombre: 'IBM Plex Mono', consulta: 'IBM+Plex+Mono:wght@400;500;600', archivo: 'ibm-plex-mono' },
]

await mkdir(DESTINO, { recursive: true })

const reglas = []

for (const familia of FAMILIAS) {
  const css = await (await fetch(
    `https://fonts.googleapis.com/css2?family=${familia.consulta}&display=swap`,
    { headers: { 'user-agent': UA } },
  )).text()

  // El CSS viene por subconjunto; nos quedamos con el bloque latin de cada peso.
  const bloques = css.split('/*').filter((b) => b.trimStart().startsWith('latin */'))

  // Algunas familias son variables: Google sirve el mismo archivo para todos
  // los pesos. Se baja una vez y se declara un rango, en vez de repetir el
  // mismo woff2 cuatro veces.
  const porArchivo = new Map()

  for (const bloque of bloques) {
    const peso = bloque.match(/font-weight:\s*(\d+)/)?.[1]
    const url = bloque.match(/url\((https:[^)]+\.woff2)\)/)?.[1]
    if (!peso || !url) continue

    if (!porArchivo.has(url)) {
      porArchivo.set(url, {
        pesos: [],
        rango: bloque.match(/unicode-range:\s*([^;]+);/)?.[1],
        ancho: bloque.match(/font-stretch:\s*([^;]+);/)?.[1],
      })
    }
    porArchivo.get(url).pesos.push(Number(peso))
  }

  for (const [url, datosUrl] of porArchivo) {
    const pesos = datosUrl.pesos.sort((a, b) => a - b)
    const variable = pesos.length > 1
    const nombre = `${familia.archivo}-${variable ? 'variable' : pesos[0]}.woff2`

    const datos = Buffer.from(await (await fetch(url, { headers: { 'user-agent': UA } })).arrayBuffer())
    await writeFile(`${DESTINO}/${nombre}`, datos)
    console.log(`  ${nombre.padEnd(30)} ${(datos.length / 1024).toFixed(1).padStart(6)} kB  ${variable ? `pesos ${pesos[0]}-${pesos.at(-1)}` : `peso ${pesos[0]}`}`)

    reglas.push(`@font-face {
  font-family: '${familia.nombre}';
  font-style: normal;
  font-weight: ${variable ? `${pesos[0]} ${pesos.at(-1)}` : pesos[0]};${datosUrl.ancho ? `\n  font-stretch: ${datosUrl.ancho};` : ''}
  font-display: swap;
  src: url('/fuentes/${nombre}') format('woff2');${datosUrl.rango ? `\n  unicode-range: ${datosUrl.rango};` : ''}
}`)
  }
}

await writeFile(CSS, `/* Generado por scripts/bajar-fuentes.mjs. No lo edites a mano. */

${reglas.join('\n\n')}
`)

console.log(`\n  ${reglas.length} @font-face en ${CSS}`)

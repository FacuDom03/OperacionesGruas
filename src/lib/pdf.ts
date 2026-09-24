import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer'
import { crearTokenDeImpresion } from '@/lib/token-impresion'

/**
 * Genera un PDF abriendo una ruta /print de la misma app con Puppeteer.
 * Asi el PDF sale igual a lo que se ve en pantalla y no hay dos maquetados
 * que mantener (capitulo 7 del spec).
 */
export async function pdfDeRuta(
  ruta: string,
  opciones: { horizontal?: boolean; consulta?: string } = {},
): Promise<Buffer> {
  // Se pide a si misma por loopback: no hace falta salir a internet ni que el
  // dominio publico resuelva desde adentro del contenedor.
  const base = `http://127.0.0.1:${process.env.PORT ?? 3000}`
  // El token firma la ruta; lo que venga en `consulta` son solo filtros de
  // presentacion, y para usarlos igual hace falta un token valido.
  const extra = opciones.consulta ? `&${opciones.consulta.replace(/^\?/, '')}` : ''
  const url = `${base}${ruta}?token=${crearTokenDeImpresion(ruta)}${extra}`

  const navegador = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    // Sin esto Chromium no arranca dentro de Docker.
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const pagina = await navegador.newPage()

    // Lo que la ruta escriba en la consola del navegador se pasa al log del
    // servidor: si la hoja falla, el motivo tiene que quedar en algun lado.
    pagina.on('pageerror', (e) => console.error('[pdf] error en la pagina:', ruta, String(e)))

    const respuesta = await pagina.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })

    if (!respuesta || !respuesta.ok()) {
      throw new Error(`La hoja ${ruta} respondio ${respuesta?.status() ?? 'sin respuesta'}.`)
    }

    // Si el token no sirvio, /print manda a /ingresar y el navegador sigue el
    // redirect: sin esto, el PDF saldria siendo una foto de la pantalla de
    // ingreso, con 200 y todo.
    if (pagina.url().includes('/ingresar')) {
      throw new Error(`La hoja ${ruta} pidio sesion: el token de impresion no sirvio. Revisa AUTH_SECRET.`)
    }

    // Una pantalla de error de Next tambien se imprime: el PDF sale con 200,
    // empieza con %PDF- y adentro dice "Application error". Antes de armarlo
    // hay que mirar que se renderizo de verdad.
    //
    // Si la hoja se atajo sola, deja el motivo en data-error-de-hoja, que es
    // mucho mas util que el texto generico de Next.
    const problema = await pagina.evaluate(() => {
      const marcado = document.querySelector('[data-error-de-hoja]')
      if (marcado) return marcado.getAttribute('data-error-de-hoja')

      const texto = document.body?.innerText ?? ''
      const roto = /Application error|server-side exception|No se pudo mostrar|This page could not be found/i
      return roto.test(texto) ? texto.slice(0, 300) : null
    })

    if (problema) {
      throw new Error(`La hoja ${ruta} no se pudo armar. La pagina dice: ${problema.replace(/\s+/g, ' ').trim()}`)
    }

    return Buffer.from(
      await pagina.pdf({
        format: 'A4',
        landscape: opciones.horizontal ?? false,
        printBackground: true,
        margin: { top: '12mm', right: '10mm', bottom: '12mm', left: '10mm' },
      }),
    )
  } finally {
    await navegador.close()
  }
}

/**
 * Arma el PDF y lo devuelve como respuesta, o explica en castellano por que no
 * se pudo. Sin esto, un error al armar la hoja llega al usuario como una
 * pestaña en blanco: el <a target="_blank"> no muestra el 500 de Next.
 */
export async function respuestaPdf(
  ruta: string,
  nombre: string,
  opciones: { horizontal?: boolean; consulta?: string } = {},
): Promise<Response> {
  let pdf: Buffer
  try {
    pdf = await pdfDeRuta(ruta, opciones)
  } catch (error) {
    console.error('[pdf] no se pudo armar', ruta, error)
    const detalle = error instanceof Error ? error.message : String(error)
    return new Response(
      `No se pudo armar el PDF.\n\n${detalle}\n\n`
      + 'Si vuelve a pasar, avisá con la fecha y la hora: el motivo queda en el log del servidor.',
      { status: 500, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    )
  }

  await guardarPdf(nombre, pdf)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${nombre}.pdf"`,
    },
  })
}

/**
 * Guarda el PDF con el numero de salida como nombre, para poder adjuntarlo al
 * WhatsApp sin volver a generarlo (CLAUDE.md). Se pisa el anterior: si la
 * salida cambio, el archivo guardado tiene que ser el nuevo.
 */
export async function guardarPdf(nombre: string, contenido: Buffer): Promise<string | null> {
  const carpeta = process.env.PDF_STORAGE_PATH
  if (!carpeta) return null

  const destino = join(carpeta, `${nombre}.pdf`)

  try {
    await mkdir(dirname(destino), { recursive: true })
    await writeFile(destino, contenido)
    return destino
  } catch (error) {
    // Que falle el guardado no tiene por que dejar al usuario sin su PDF.
    console.error('[pdf] no se pudo guardar en disco:', error)
    return null
  }
}

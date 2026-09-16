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
  opciones: { horizontal?: boolean } = {},
): Promise<Buffer> {
  // Se pide a si misma por loopback: no hace falta salir a internet ni que el
  // dominio publico resuelva desde adentro del contenedor.
  const base = `http://127.0.0.1:${process.env.PORT ?? 3000}`
  const url = `${base}${ruta}?token=${crearTokenDeImpresion(ruta)}`

  const navegador = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    // Sin esto Chromium no arranca dentro de Docker.
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const pagina = await navegador.newPage()
    await pagina.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 })

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

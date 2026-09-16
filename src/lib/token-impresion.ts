import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Token de un solo uso para las rutas /print.
 *
 * Los PDF los arma Puppeteer abriendo las mismas rutas de la app, pero ese
 * navegador no tiene la sesion del usuario. En vez de dejar /print abierto
 * (CLAUDE.md: nunca queda publico), se le pasa un token firmado que sirve una
 * sola vez y por un minuto.
 *
 * El registro de usados es en memoria: alcanza porque el que pide el PDF y el
 * que lo abre son el mismo proceso. Si algun dia la app corre en varias
 * instancias, esto tiene que pasar a la base.
 */
const VALIDEZ_SEGUNDOS = 60

const usados = new Map<string, number>()

function firmar(cuerpo: string): string {
  const secreto = process.env.AUTH_SECRET
  if (!secreto) throw new Error('Falta AUTH_SECRET: sin eso no se pueden firmar los tokens de impresion.')
  return createHmac('sha256', secreto).update(cuerpo).digest('base64url')
}

/** Saca del registro los tokens que ya vencieron, asi no crece para siempre. */
function limpiarVencidos() {
  const ahora = Date.now()
  for (const [token, vence] of usados) {
    if (vence < ahora) usados.delete(token)
  }
}

export function crearTokenDeImpresion(ruta: string): string {
  const vence = Date.now() + VALIDEZ_SEGUNDOS * 1000
  const nonce = randomBytes(8).toString('base64url')
  const cuerpo = `${ruta}|${vence}|${nonce}`
  return `${Buffer.from(cuerpo).toString('base64url')}.${firmar(cuerpo)}`
}

export function tokenDeImpresionValido(token: string | undefined, ruta: string): boolean {
  if (!token) return false

  const [cuerpoCodificado, firma] = token.split('.')
  if (!cuerpoCodificado || !firma) return false

  const cuerpo = Buffer.from(cuerpoCodificado, 'base64url').toString()
  const esperada = Buffer.from(firmar(cuerpo))
  const recibida = Buffer.from(firma)
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) return false

  const [rutaFirmada, venceTexto] = cuerpo.split('|')
  const vence = Number(venceTexto)

  if (rutaFirmada !== ruta) return false
  if (!vence || vence < Date.now()) return false

  limpiarVencidos()
  if (usados.has(token)) return false
  usados.set(token, vence)

  return true
}

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const LARGO_CLAVE = 64

/**
 * Hash de contraseña con scrypt, que viene en Node. No usamos bcrypt para no
 * arrastrar una dependencia nativa que hay que compilar en la imagen Docker.
 *
 * Formato guardado: scrypt$<salt en hex>$<hash en hex>
 */
export async function hashearPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, LARGO_CLAVE)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

/** Compara en tiempo constante: no filtra información por lo que tarda. */
export async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  const partes = guardado.split('$')
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false

  const salt = Buffer.from(partes[1], 'hex')
  const esperado = Buffer.from(partes[2], 'hex')
  if (esperado.length !== LARGO_CLAVE) return false

  const hash = await scrypt(password, salt, LARGO_CLAVE)
  return timingSafeEqual(hash, esperado)
}

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const LARGO_CLAVE = 64

// Fija y sin secreto: lo unico que importa de este hash es cuanto tarda.
const SAL_DE_DESCARTE = Buffer.alloc(16, 7)

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

/**
 * Calcula un hash que se tira, solo para gastar el mismo tiempo que una
 * verificacion de verdad. Se usa cuando el correo no existe: si no, la
 * respuesta vuelve al instante y eso ya dice que ese correo no esta dado de
 * alta.
 */
export async function hashDeDescarte(password: string): Promise<void> {
  await scrypt(password, SAL_DE_DESCARTE, LARGO_CLAVE)
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

/**
 * Central Operativa — Gruas Daniele
 * Alta de un usuario del sistema. Sirve para crear el primer admin, cuando
 * todavia no hay nadie que pueda entrar a la pantalla de usuarios.
 *
 *   npm run usuario -- --email juan@gruasdaniele.com --rol admin
 *
 * La contraseña se pasa por la variable PASSWORD, para que no quede escrita en
 * el historial de la terminal:
 *
 *   PASSWORD='la-clave' npm run usuario -- --email juan@... --rol admin
 *
 * Si el correo ya existe, actualiza rol y contraseña en vez de duplicar.
 */
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { usuarios } from '../src/db/schema.js'
import { hashearPassword } from '../src/lib/password.js'

const ROLES = ['admin', 'operaciones', 'mantenimiento', 'consulta'] as const
type Rol = (typeof ROLES)[number]

/** Lee --clave valor de la linea de comandos. */
function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`)
  return i === -1 ? undefined : process.argv[i + 1]
}

function salirCon(mensaje: string): never {
  console.error(`\n  ${mensaje}\n`)
  process.exit(1)
}

const email = argumento('email')?.trim().toLowerCase()
const rol = (argumento('rol') ?? 'admin') as Rol
const password = process.env.PASSWORD

if (!email) salirCon('Falta --email.')
if (!email.includes('@')) salirCon(`"${email}" no parece un correo.`)
if (!ROLES.includes(rol)) salirCon(`Rol invalido: "${rol}". Son: ${ROLES.join(', ')}.`)
if (!password) salirCon('Falta la contraseña. Pasala en la variable PASSWORD.')
if (password.length < 8) salirCon('La contraseña tiene que tener 8 caracteres o mas.')

const passwordHash = await hashearPassword(password)

const [existente] = await db.select().from(usuarios).where(eq(usuarios.email, email)).limit(1)

if (existente) {
  await db
    .update(usuarios)
    .set({ passwordHash, rol, activo: true })
    .where(eq(usuarios.id, existente.id))
  console.log(`\n  Usuario actualizado: ${email} (${rol})\n`)
} else {
  await db.insert(usuarios).values({ email, passwordHash, rol })
  console.log(`\n  Usuario creado: ${email} (${rol})\n`)
}

process.exit(0)

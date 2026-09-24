/**
 * Aplica las migraciones pendientes de `drizzle/` al arrancar el servidor.
 * Es lo que evita correrlas a mano en produccion: el contenedor arranca, migra
 * y recien ahi empieza a servir. Ver CLAUDE.md, seccion "Base de datos".
 *
 * Si no se pueden aplicar, el proceso se corta.
 *
 * Antes no: el error se tiraba, Next lo escribia en el log como "error loading
 * instrumentation hook" y **seguia sirviendo igual**, con el esquema viejo. Eso
 * deja la app a medias de la peor manera: la mayoria de las pantallas andan y
 * unas pocas fallan sueltas, sin que nada relacione una cosa con la otra. Es
 * preferible que el contenedor no levante: EasyPanel lo muestra y el motivo
 * queda en la primera linea del log.
 */
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

// Al arrancar junto con Postgres, la base puede tardar unos segundos en
// aceptar conexiones. Se reintenta antes de dar el deploy por perdido.
const INTENTOS = 5
const ESPERA_MS = 3000

const esperar = (ms: number) => new Promise((seguir) => setTimeout(seguir, ms))

if (!process.env.DATABASE_URL) {
  console.error('[migraciones] falta DATABASE_URL. La app no puede arrancar sin base de datos.')
  process.exit(1)
}

const cliente = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })

let ultimoError: unknown = null

for (let intento = 1; intento <= INTENTOS; intento++) {
  try {
    await migrate(drizzle(cliente), { migrationsFolder: resolve(process.cwd(), 'drizzle') })
    console.log('[migraciones] al dia')
    ultimoError = null
    break
  } catch (error) {
    ultimoError = error
    console.error(`[migraciones] intento ${intento} de ${INTENTOS} fallido:`, error)
    if (intento < INTENTOS) await esperar(ESPERA_MS)
  }
}

await cliente.end()

if (ultimoError) {
  console.error(
    '\n[migraciones] NO SE PUDIERON APLICAR. La app no arranca a proposito: servir con el\n'
    + 'esquema viejo hace que algunas pantallas fallen sueltas y cueste darse cuenta.\n'
    + 'Revisa que DATABASE_URL apunte a la base de la app y que el usuario pueda crear tablas.\n',
  )
  process.exit(1)
}

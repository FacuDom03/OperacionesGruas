/**
 * Aplica las migraciones pendientes de `drizzle/` al arrancar el servidor.
 * Es lo que evita correrlas a mano en produccion: el contenedor arranca, migra
 * y recien ahi empieza a servir. Ver CLAUDE.md, seccion "Base de datos".
 */
import { resolve } from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. La app no puede arrancar sin base de datos.')
}

// Conexion aparte y de una sola sesion: migrar no tiene por que competir con el
// pool de consultas, y se cierra apenas termina. onnotice vacio para no escupir
// en cada arranque los NOTICE de "ya existe" del esquema de control de drizzle.
const cliente = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(cliente), {
    migrationsFolder: resolve(process.cwd(), 'drizzle'),
  })
  console.log('[migraciones] al dia')
} catch (error) {
  console.error('[migraciones] fallaron:', error)
  throw error
} finally {
  await cliente.end()
}

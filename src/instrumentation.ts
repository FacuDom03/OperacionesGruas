/**
 * Se ejecuta una sola vez cuando arranca el servidor, antes de atender pedidos.
 *
 * Aplica las migraciones pendientes de `drizzle/`. Es lo que evita tener que
 * correrlas a mano en produccion: el contenedor arranca, migra y recien ahi
 * empieza a servir. Ver CLAUDE.md, seccion "Base de datos".
 */
export async function register() {
  // Solo en el runtime de Node: en el edge no hay acceso a la base ni al disco.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL. La app no puede arrancar sin base de datos.')
  }

  const { resolve } = await import('node:path')
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { migrate } = await import('drizzle-orm/postgres-js/migrator')
  const postgres = (await import('postgres')).default

  // Conexion aparte y de una sola sesion: migrar no tiene por que competir con
  // el pool de consultas, y se cierra apenas termina.
  // onnotice vacio: si no, cada arranque escupe los NOTICE de "ya existe" que
  // tira Postgres al recrear el esquema de control de drizzle.
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
}

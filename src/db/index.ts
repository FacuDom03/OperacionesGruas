import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

/**
 * La conexion se abre la primera vez que se usa, no al importar el modulo.
 *
 * Importa que sea asi por el build: `next build` carga todos los modulos para
 * analizar las rutas, y si aca hubiera un throw de entrada, compilar exigiria
 * una DATABASE_URL que en ese momento no hace falta para nada. Dentro del
 * Dockerfile no hay .env, asi que el build reventaba antes de empezar.
 *
 * postgres() tampoco se conecta sola: espera a la primera consulta.
 */
let instancia: PostgresJsDatabase<typeof schema> | null = null

function conexion(): PostgresJsDatabase<typeof schema> {
  if (instancia) return instancia

  if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL. Copiá .env.example a .env y completalo.')
  }

  instancia = drizzle(postgres(process.env.DATABASE_URL, { max: 10 }), { schema })
  return instancia
}

/**
 * Se usa igual que siempre (`db.select()...`): el proxy resuelve la conexion
 * recien cuando alguien toca una propiedad.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_destino, propiedad) {
    const real = conexion()
    const valor = Reflect.get(real, propiedad, real)
    return typeof valor === 'function' ? valor.bind(real) : valor
  },
})

export { schema }

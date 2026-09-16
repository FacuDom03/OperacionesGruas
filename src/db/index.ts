import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

if (!process.env.DATABASE_URL) {
  throw new Error('Falta DATABASE_URL. Copiá .env.example a .env y completalo.')
}

/** Cliente de consultas. En desarrollo se reutiliza entre recargas. */
const queryClient = postgres(process.env.DATABASE_URL, { max: 10 })

export const db = drizzle(queryClient, { schema })
export { schema }

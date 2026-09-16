import { count } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import { empresas, equipos, lugares, personal } from '@/db/schema'

// Lee la base en cada pedido. Sin esto, el build intenta prerenderizar la
// pagina y falla dentro de Docker, donde todavia no hay base a la que conectarse.
export const dynamic = 'force-dynamic'

async function filas(tabla: PgTable) {
  const [{ total }] = await db.select({ total: count() }).from(tabla)
  return total
}

export default async function Inicio() {
  const [totalEmpresas, totalLugares, totalPersonal, totalEquipos] = await Promise.all([
    filas(empresas),
    filas(lugares),
    filas(personal),
    filas(equipos),
  ])

  const maestros = [
    { nombre: 'Empresas', total: totalEmpresas },
    { nombre: 'Lugares', total: totalLugares },
    { nombre: 'Personal', total: totalPersonal },
    { nombre: 'Equipos', total: totalEquipos },
  ]

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight">Central Operativa</h1>
        <p className="mt-1 text-sm text-[var(--color-tenue)]">
          Gruas Daniele — salidas de trabajo, vehiculos livianos y checklists.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--color-tenue)]">
          Maestros cargados
        </h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {maestros.map((m) => (
            <div
              key={m.nombre}
              className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)] px-4 py-5"
            >
              <p className="text-sm text-[var(--color-tenue)]">{m.nombre}</p>
              <p className="tabular mt-1 text-3xl font-semibold">{m.total}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-[var(--color-tenue)]">
        Las pantallas de salidas, livianos y checklists se van agregando por fase.
        El plan esta en <code className="text-xs">docs/spec.md</code>, capitulo 12.
      </p>
    </main>
  )
}

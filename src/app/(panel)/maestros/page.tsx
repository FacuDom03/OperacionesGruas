import Link from 'next/link'
import { count } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import { db } from '@/db'
import { clientes, empresas, equipos, lugares, personal } from '@/db/schema'
import { Titulo } from '@/components/ui'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

async function filas(tabla: PgTable) {
  const [{ total }] = await db.select({ total: count() }).from(tabla)
  return total
}

export default async function Maestros() {
  await sesionRequerida()

  const [nEmpresas, nPersonal, nEquipos, nClientes, nLugares] = await Promise.all([
    filas(empresas), filas(personal), filas(equipos), filas(clientes), filas(lugares),
  ])

  const secciones = [
    { href: '/maestros/personal', nombre: 'Personal', total: nPersonal, detalle: 'Choferes, operadores, verificadores y ayudantes' },
    { href: '/maestros/equipos', nombre: 'Equipos', total: nEquipos, detalle: 'Gruas, camiones, livianos y auxiliares' },
    { href: '/maestros/empresas', nombre: 'Empresas', total: nEmpresas, detalle: 'Las empresas del grupo' },
    { href: '/maestros/clientes', nombre: 'Clientes', total: nClientes, detalle: 'Padron propio, hasta definir si sale de Odoo' },
    { href: '/maestros/lugares', nombre: 'Lugares', total: nLugares, detalle: 'Base, Casona, Taller Externo y demas' },
  ]

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo>Maestros</Titulo>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {secciones.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)] px-4 py-5 hover:border-[var(--color-acento)]"
          >
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{s.nombre}</span>
              <span className="tabular text-2xl font-semibold">{s.total}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-tenue)]">{s.detalle}</p>
          </Link>
        ))}
      </div>
    </main>
  )
}

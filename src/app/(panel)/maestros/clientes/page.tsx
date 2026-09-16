import Link from 'next/link'
import { asc, ilike, or } from 'drizzle-orm'
import { db } from '@/db'
import { clientes } from '@/db/schema'
import { Buscador } from '@/components/buscador'
import { BotonLink, Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function Clientes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sesion = await sesionRequerida()
  const { q } = await searchParams
  const busqueda = q?.trim()

  const filas = await db
    .select()
    .from(clientes)
    .where(busqueda ? or(ilike(clientes.razonSocial, `%${busqueda}%`), ilike(clientes.cuit, `%${busqueda}%`)) : undefined)
    .orderBy(asc(clientes.razonSocial))

  const editable = puede(sesion.user.rol, 'editar_maestros')

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo accion={editable ? <BotonLink href="/maestros/clientes/nuevo">Nuevo cliente</BotonLink> : undefined}>
        Clientes
      </Titulo>

      <Buscador placeholder="Buscar por razon social o CUIT" valor={busqueda} />

      <Panel>
        {filas.length === 0 ? (
          <Vacio>
            No hay clientes cargados. Todavia esta por definirse si el padron sale de Odoo
            (punto 4 del capitulo 11 del spec).
          </Vacio>
        ) : (
          <Tabla cabeceras={['Razon social', 'CUIT', 'Odoo', 'Estado']}>
            {filas.map((c) => (
              <Fila key={c.id}>
                <Celda className="font-medium">
                  {editable ? (
                    <Link href={`/maestros/clientes/${c.id}`} className="text-[var(--color-acento)] hover:underline">{c.razonSocial}</Link>
                  ) : c.razonSocial}
                </Celda>
                <Celda className="tabular">{c.cuit ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className="tabular">{c.odooId ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda>{c.activo ? 'Activo' : 'Inactivo'}</Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-sm text-[var(--color-tenue)]">{filas.length} clientes.</p>
    </main>
  )
}

import Link from 'next/link'
import { asc, ilike, or } from 'drizzle-orm'
import { db } from '@/db'
import { equipos } from '@/db/schema'
import { Buscador } from '@/components/buscador'
import { BotonLink, Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function Equipos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sesion = await sesionRequerida()
  const { q } = await searchParams
  const busqueda = q?.trim()

  const filas = await db
    .select()
    .from(equipos)
    .where(
      busqueda
        ? or(
            ilike(equipos.interno, `%${busqueda}%`),
            ilike(equipos.patente, `%${busqueda}%`),
            ilike(equipos.marca, `%${busqueda}%`),
            ilike(equipos.tipo, `%${busqueda}%`),
          )
        : undefined,
    )
    .orderBy(asc(equipos.interno))

  const editable = puede(sesion.user.rol, 'editar_maestros')

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo accion={editable ? <BotonLink href="/maestros/equipos/nuevo">Nuevo equipo</BotonLink> : undefined}>
        Equipos
      </Titulo>

      <Buscador placeholder="Buscar por interno, patente, marca o tipo" valor={busqueda} />

      <Panel>
        {filas.length === 0 ? (
          <Vacio>No hay equipos que coincidan.</Vacio>
        ) : (
          <Tabla cabeceras={['Interno', 'Tipo', 'TNs', 'Marca', 'Modelo', 'Patente', 'Auxiliar']}>
            {filas.map((e) => (
              <Fila key={e.id}>
                <Celda className="tabular font-medium">
                  {editable ? (
                    <Link href={`/maestros/equipos/${e.id}`} className="text-[var(--color-acento)] hover:underline">{e.interno}</Link>
                  ) : e.interno}
                  {e.activo ? null : <span className="ml-2 text-xs text-[var(--color-tenue)]">(inactivo)</span>}
                </Celda>
                <Celda>{e.tipo}</Celda>
                <Celda className="tabular">{e.tns ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda>{e.marca ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda>{e.modelo ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className="tabular">{e.patente ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className="tabular">{e.equipoAsignado ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-sm text-[var(--color-tenue)]">{filas.length} equipos.</p>
    </main>
  )
}

import Link from 'next/link'
import { asc, ilike, or } from 'drizzle-orm'
import { db } from '@/db'
import { empresas } from '@/db/schema'
import { Buscador } from '@/components/buscador'
import { BotonLink, Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { puede } from '@/lib/permisos'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function Empresas({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sesion = await sesionRequerida()
  const { q } = await searchParams
  const busqueda = q?.trim()

  const filas = await db
    .select()
    .from(empresas)
    .where(
      busqueda
        ? or(
            ilike(empresas.razonSocial, `%${busqueda}%`),
            ilike(empresas.nombreCorto, `%${busqueda}%`),
            ilike(empresas.codigo, `%${busqueda}%`),
          )
        : undefined,
    )
    .orderBy(asc(empresas.codigo))

  const editable = puede(sesion.user.rol, 'editar_maestros')

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo accion={editable ? <BotonLink href="/maestros/empresas/nuevo">Nueva empresa</BotonLink> : undefined}>
        Empresas del grupo
      </Titulo>

      <Buscador placeholder="Buscar por codigo, razon social o nombre corto" valor={busqueda} />

      <Panel>
        {filas.length === 0 ? (
          <Vacio>No hay empresas que coincidan.</Vacio>
        ) : (
          <Tabla cabeceras={['Codigo', 'Razon social', 'Nombre corto', 'CUIT', 'Estado']}>
            {filas.map((e) => (
              <Fila key={e.id}>
                <Celda className="tabular font-medium">
                  {editable ? (
                    <Link href={`/maestros/empresas/${e.id}`} className="text-[var(--color-acento)] hover:underline">
                      {e.codigo}
                    </Link>
                  ) : (
                    e.codigo
                  )}
                </Celda>
                <Celda>{e.razonSocial}</Celda>
                <Celda>{e.nombreCorto}</Celda>
                <Celda className="tabular">
                  {e.cuit ?? <span className="text-[var(--color-tenue)]">sin CUIT</span>}
                </Celda>
                <Celda>{e.activa ? 'Activa' : 'Inactiva'}</Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-sm text-[var(--color-tenue)]">
        {filas.length} {filas.length === 1 ? 'empresa' : 'empresas'}.
      </p>
    </main>
  )
}

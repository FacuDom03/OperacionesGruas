import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { lugares } from '@/db/schema'
import { BotonLink, Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function Lugares() {
  const sesion = await sesionRequerida()
  const filas = await db.select().from(lugares).orderBy(asc(lugares.nombre))
  const editable = puede(sesion.user.rol, 'editar_maestros')

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo accion={editable ? <BotonLink href="/maestros/lugares/nuevo">Nuevo lugar</BotonLink> : undefined}>
        Lugares
      </Titulo>

      <Panel>
        {filas.length === 0 ? (
          <Vacio>Todavia no hay lugares cargados.</Vacio>
        ) : (
          <Tabla cabeceras={['Codigo', 'Nombre']}>
            {filas.map((l) => (
              <Fila key={l.id}>
                <Celda className="font-medium">
                  {editable ? (
                    <Link href={`/maestros/lugares/${l.id}`} className="text-[var(--color-acento)] hover:underline">{l.codigo}</Link>
                  ) : l.codigo}
                </Celda>
                <Celda>{l.nombre}</Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-sm text-[var(--color-tenue)]">{filas.length} lugares.</p>
    </main>
  )
}

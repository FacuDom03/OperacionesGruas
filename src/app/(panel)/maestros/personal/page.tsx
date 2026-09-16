import Link from 'next/link'
import { asc, eq, ilike, or } from 'drizzle-orm'
import { db } from '@/db'
import { empresas, personal } from '@/db/schema'
import { Buscador } from '@/components/buscador'
import { BotonLink, Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function Personal({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const sesion = await sesionRequerida()
  const { q } = await searchParams
  const busqueda = q?.trim()

  const filas = await db
    .select({
      id: personal.id,
      apellidoNombre: personal.apellidoNombre,
      legajo: personal.legajo,
      documento: personal.documento,
      puesto: personal.puesto,
      telefonoWsp: personal.telefonoWsp,
      activo: personal.activo,
      esChofer: personal.esChofer,
      esVerificador: personal.esVerificador,
      esOperador: personal.esOperador,
      empresa: empresas.nombreCorto,
    })
    .from(personal)
    .leftJoin(empresas, eq(personal.empresaId, empresas.id))
    .where(
      busqueda
        ? or(
            ilike(personal.apellidoNombre, `%${busqueda}%`),
            ilike(personal.legajo, `%${busqueda}%`),
            ilike(personal.documento, `%${busqueda}%`),
          )
        : undefined,
    )
    .orderBy(asc(personal.apellidoNombre))

  const editable = puede(sesion.user.rol, 'editar_maestros')
  const sinTelefono = filas.filter((p) => !p.telefonoWsp).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo accion={editable ? <BotonLink href="/maestros/personal/nuevo">Nueva persona</BotonLink> : undefined}>
        Personal
      </Titulo>

      <Buscador placeholder="Buscar por nombre, legajo o documento" valor={busqueda} />

      <Panel>
        {filas.length === 0 ? (
          <Vacio>No hay personas que coincidan.</Vacio>
        ) : (
          <Tabla cabeceras={['Apellido y nombre', 'Legajo', 'Documento', 'Empresa', 'Puesto', 'Telefono', 'Roles']}>
            {filas.map((p) => (
              <Fila key={p.id}>
                <Celda className="font-medium">
                  {editable ? (
                    <Link href={`/maestros/personal/${p.id}`} className="text-[var(--color-acento)] hover:underline">
                      {p.apellidoNombre}
                    </Link>
                  ) : p.apellidoNombre}
                  {p.activo ? null : <span className="ml-2 text-xs text-[var(--color-tenue)]">(inactivo)</span>}
                </Celda>
                <Celda className="tabular">{p.legajo ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className="tabular">{p.documento ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda>{p.empresa ?? <span className="text-[var(--color-tenue)]">sin empresa</span>}</Celda>
                <Celda>{p.puesto ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className="tabular">
                  {p.telefonoWsp ?? <span className="text-amber-700">falta</span>}
                </Celda>
                <Celda className="text-xs text-[var(--color-tenue)]">
                  {[p.esChofer && 'chofer', p.esVerificador && 'verificador', p.esOperador && 'operador']
                    .filter(Boolean)
                    .join(' · ')}
                </Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-sm text-[var(--color-tenue)]">
        {filas.length} personas
        {sinTelefono > 0 ? ` · ${sinTelefono} sin telefono cargado, que es lo que traba el envio por WhatsApp` : ''}.
      </p>
    </main>
  )
}

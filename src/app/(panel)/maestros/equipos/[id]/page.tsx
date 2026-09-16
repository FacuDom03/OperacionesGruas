import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db'
import { equipos } from '@/db/schema'
import { guardarEquipo } from '../acciones'
import { Boton, Campo, CampoSugerido, Casilla, Panel, Titulo } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function EditarEquipo({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await permisoRequerido('editar_maestros')

  const { id } = await params
  const { error } = await searchParams
  const esNuevo = id === 'nuevo'

  const [equipo, tipos] = await Promise.all([
    esNuevo
      ? Promise.resolve(undefined)
      : db.select().from(equipos).where(eq(equipos.id, Number(id))).limit(1).then((r) => r[0]),
    // Los tipos que ya existen, para sugerirlos y que la lista no se siga
    // ensuciando como paso en el Excel (ver capitulo 5 del spec).
    db.selectDistinct({ tipo: equipos.tipo }).from(equipos).where(isNotNull(equipos.tipo)).orderBy(asc(equipos.tipo)),
  ])

  if (!esNuevo && !equipo) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Titulo>{esNuevo ? 'Nuevo equipo' : equipo!.interno}</Titulo>

      <Panel>
        <form action={guardarEquipo} className="space-y-4 p-6">
          <input type="hidden" name="id" value={equipo?.id ?? ''} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Interno" nombre="interno" valor={equipo?.interno} requerido ayuda="GDU y tres digitos" />
            <CampoSugerido
              etiqueta="Tipo"
              nombre="tipo"
              valor={equipo?.tipo}
              requerido
              sugerencias={tipos.map((t) => t.tipo)}
              ayuda="Es lo que agrupa el calendario y los filtros"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Numero viejo" nombre="nroViejo" valor={equipo?.nroViejo} />
            <Campo etiqueta="TNs" nombre="tns" valor={equipo?.tns} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Marca" nombre="marca" valor={equipo?.marca} />
            <Campo etiqueta="Modelo" nombre="modelo" valor={equipo?.modelo} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Patente" nombre="patente" valor={equipo?.patente} />
            <Campo etiqueta="Equipo auxiliar" nombre="equipoAsignado" valor={equipo?.equipoAsignado} ayuda="El que suele acompañar, por ejemplo GDU600" />
          </div>

          <Casilla etiqueta="Activo" nombre="activo" marcado={equipo?.activo ?? true} />

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Boton type="submit">Guardar</Boton>
            <Link href="/maestros/equipos" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
          </div>
        </form>
      </Panel>
    </main>
  )
}

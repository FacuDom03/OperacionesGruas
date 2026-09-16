import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas } from '@/db/schema'
import { guardarEmpresa } from '../acciones'
import { Boton, Campo, Casilla, Panel, Titulo } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function EditarEmpresa({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await permisoRequerido('editar_maestros')

  const { id } = await params
  const { error } = await searchParams
  const esNueva = id === 'nuevo'

  const empresa = esNueva
    ? null
    : (await db.select().from(empresas).where(eq(empresas.id, Number(id))).limit(1))[0]

  if (!esNueva && !empresa) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Titulo>{esNueva ? 'Nueva empresa' : empresa!.razonSocial}</Titulo>

      <Panel>
        <form action={guardarEmpresa} className="space-y-4 p-6">
          <input type="hidden" name="id" value={empresa?.id ?? ''} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Codigo" nombre="codigo" valor={empresa?.codigo} requerido ayuda="GD01, GD02..." />
            <Campo etiqueta="CUIT" nombre="cuit" valor={empresa?.cuit} ayuda="Es la clave que unifica los dos Excel" />
          </div>

          <Campo etiqueta="Razon social" nombre="razonSocial" valor={empresa?.razonSocial} requerido />
          <Campo etiqueta="Nombre corto" nombre="nombreCorto" valor={empresa?.nombreCorto} requerido ayuda="El que se ve en las pantallas y en el PDF" />

          <Casilla etiqueta="Activa" nombre="activa" marcado={empresa?.activa ?? true} />

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <Boton type="submit">Guardar</Boton>
            <Link href="/maestros/empresas" className="text-sm text-[var(--color-tenue)] hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </Panel>
    </main>
  )
}

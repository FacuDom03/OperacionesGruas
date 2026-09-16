import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { lugares } from '@/db/schema'
import { guardarLugar } from '../acciones'
import { Boton, Campo, Panel, Titulo } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function EditarLugar({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await permisoRequerido('editar_maestros')

  const { id } = await params
  const { error } = await searchParams
  const esNuevo = id === 'nuevo'

  const lugar = esNuevo
    ? null
    : (await db.select().from(lugares).where(eq(lugares.id, Number(id))).limit(1))[0]

  if (!esNuevo && !lugar) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Titulo>{esNuevo ? 'Nuevo lugar' : lugar!.nombre}</Titulo>

      <Panel>
        <form action={guardarLugar} className="space-y-4 p-6">
          <input type="hidden" name="id" value={lugar?.id ?? ''} />
          <Campo etiqueta="Codigo" nombre="codigo" valor={lugar?.codigo} requerido />
          <Campo etiqueta="Nombre" nombre="nombre" valor={lugar?.nombre} requerido ayuda="Base, Casona, Concesionario, Domicilio, Mantenimiento, Taller Externo, Otros" />

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Boton type="submit">Guardar</Boton>
            <Link href="/maestros/lugares" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
          </div>
        </form>
      </Panel>
    </main>
  )
}

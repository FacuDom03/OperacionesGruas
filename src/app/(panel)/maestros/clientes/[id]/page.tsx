import Link from 'next/link'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes } from '@/db/schema'
import { guardarCliente } from '../acciones'
import { Boton, Campo, Casilla, Panel, Titulo } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function EditarCliente({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await permisoRequerido('editar_maestros')

  const { id } = await params
  const { error } = await searchParams
  const esNuevo = id === 'nuevo'

  const cliente = esNuevo
    ? null
    : (await db.select().from(clientes).where(eq(clientes.id, Number(id))).limit(1))[0]

  if (!esNuevo && !cliente) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Titulo>{esNuevo ? 'Nuevo cliente' : cliente!.razonSocial}</Titulo>

      <Panel>
        <form action={guardarCliente} className="space-y-4 p-6">
          <input type="hidden" name="id" value={cliente?.id ?? ''} />

          <Campo etiqueta="Razon social" nombre="razonSocial" valor={cliente?.razonSocial} requerido />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="CUIT" nombre="cuit" valor={cliente?.cuit} />
            <Campo etiqueta="Id de Odoo" nombre="odooId" valor={cliente?.odooId} ayuda="Solo si despues se sincroniza" />
          </div>

          <Casilla etiqueta="Activo" nombre="activo" marcado={cliente?.activo ?? true} />

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Boton type="submit">Guardar</Boton>
            <Link href="/maestros/clientes" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
          </div>
        </form>
      </Panel>
    </main>
  )
}

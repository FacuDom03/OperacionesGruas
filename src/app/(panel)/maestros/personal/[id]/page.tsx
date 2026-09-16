import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas, personal } from '@/db/schema'
import { guardarPersona } from '../acciones'
import { Boton, Campo, Casilla, Panel, Seleccion, Titulo } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function EditarPersona({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await permisoRequerido('editar_maestros')

  const { id } = await params
  const { error } = await searchParams
  const esNueva = id === 'nuevo'

  const [persona, listaEmpresas] = await Promise.all([
    esNueva
      ? Promise.resolve(undefined)
      : db.select().from(personal).where(eq(personal.id, Number(id))).limit(1).then((r) => r[0]),
    db.select().from(empresas).orderBy(asc(empresas.nombreCorto)),
  ])

  if (!esNueva && !persona) notFound()

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Titulo>{esNueva ? 'Nueva persona' : persona!.apellidoNombre}</Titulo>

      <Panel>
        <form action={guardarPersona} className="space-y-4 p-6">
          <input type="hidden" name="id" value={persona?.id ?? ''} />

          <Campo etiqueta="Apellido y nombre" nombre="apellidoNombre" valor={persona?.apellidoNombre} requerido />

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Legajo" nombre="legajo" valor={persona?.legajo} ayuda="GDL001" />
            <Campo etiqueta="Documento" nombre="documento" valor={persona?.documento} ayuda="Es la clave que evita duplicados" />
          </div>

          <Seleccion
            etiqueta="Empresa"
            nombre="empresaId"
            valor={persona?.empresaId}
            vacio="Sin empresa"
            opciones={listaEmpresas.map((e) => ({ valor: e.id, texto: `${e.codigo} · ${e.nombreCorto}` }))}
          />

          <Campo etiqueta="Puesto" nombre="puesto" valor={persona?.puesto} ayuda="Operador de Grua 25/50 TN" />

          <Campo
            etiqueta="Telefono de WhatsApp"
            nombre="telefonoWsp"
            valor={persona?.telefonoWsp}
            ayuda="54 + 9 + area + numero, sin el 15. Ejemplo: 5491155782210"
          />

          <fieldset className="space-y-2 pt-2">
            <legend className="text-sm font-medium">Roles en las salidas</legend>
            <Casilla etiqueta="Es chofer" nombre="esChofer" marcado={persona?.esChofer ?? false} />
            <Casilla etiqueta="Es verificador" nombre="esVerificador" marcado={persona?.esVerificador ?? false} />
            <Casilla etiqueta="Es operador" nombre="esOperador" marcado={persona?.esOperador ?? false} />
          </fieldset>

          <Casilla etiqueta="Activo" nombre="activo" marcado={persona?.activo ?? true} />

          {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <Boton type="submit">Guardar</Boton>
            <Link href="/maestros/personal" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
          </div>
        </form>
      </Panel>
    </main>
  )
}

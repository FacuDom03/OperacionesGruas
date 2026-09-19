import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { personal, usuarios } from '@/db/schema'
import { guardarUsuario } from '../acciones'
import { Boton, Campo, Casilla, ErrorCampo, Panel, Seleccion, Titulo } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const ROLES = [
  { valor: 'admin', texto: 'Admin — todo, incluidos maestros y usuarios' },
  { valor: 'operaciones', texto: 'Operaciones — salidas, livianos, imprimir' },
  { valor: 'mantenimiento', texto: 'Mantenimiento — checklists' },
  { valor: 'consulta', texto: 'Consulta — solo lectura' },
]

export default async function EditarUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const sesion = await permisoRequerido('administrar_usuarios')

  const { id } = await params
  const { error } = await searchParams
  const esNuevo = id === 'nuevo'

  const [usuario, gente] = await Promise.all([
    esNuevo
      ? Promise.resolve(undefined)
      : db.select().from(usuarios).where(eq(usuarios.id, Number(id))).limit(1).then((r) => r[0]),
    db.select().from(personal).where(eq(personal.activo, true)).orderBy(asc(personal.apellidoNombre)),
  ])

  if (!esNuevo && !usuario) notFound()

  const esUnoMismo = usuario?.id === Number(sesion.user.id)

  return (
    <main className="mx-auto w-full max-w-[640px] flex-grow px-6 py-5">
      <Titulo bajada={esNuevo ? undefined : usuario!.email}>
        {esNuevo ? 'Nuevo usuario' : 'Editar usuario'}
      </Titulo>

      <Panel>
        <form action={guardarUsuario} className="space-y-4 p-6">
          <input type="hidden" name="id" value={usuario?.id ?? ''} />

          <Campo etiqueta="Correo" nombre="email" valor={usuario?.email} tipo="email" requerido />

          <Seleccion
            etiqueta="Rol"
            nombre="rol"
            valor={usuario?.rol ?? 'consulta'}
            vacio={null}
            opciones={ROLES.map((r) => ({ valor: r.valor, texto: r.texto }))}
          />

          <Seleccion
            etiqueta="Persona del maestro"
            nombre="personalId"
            valor={usuario?.personalId}
            vacio="Sin vincular"
            opciones={gente.map((p) => ({ valor: p.id, texto: p.apellidoNombre }))}
          />

          <Campo
            etiqueta={esNuevo ? 'Contraseña' : 'Contraseña nueva'}
            nombre="password"
            tipo="password"
            requerido={esNuevo}
            ayuda={esNuevo ? '8 caracteres o más' : 'Dejala en blanco para no cambiarla'}
          />

          <Casilla etiqueta="Activo" nombre="activo" marcado={usuario?.activo ?? true} />

          {esUnoMismo ? (
            <p className="rounded-[5px] bg-[var(--color-acento-suave)] px-3 py-2 text-[12px] text-[var(--color-acento-oscuro)]">
              Es tu propio usuario: no podés sacarte el rol de admin ni desactivarte.
            </p>
          ) : null}

          {error ? <ErrorCampo>{error}</ErrorCampo> : null}

          <div className="flex items-center gap-3 pt-1">
            <Boton type="submit">Guardar</Boton>
            <Link href="/maestros/usuarios" className="text-[13px] text-[var(--color-tenue)] hover:underline">
              Cancelar
            </Link>
          </div>
        </form>
      </Panel>
    </main>
  )
}

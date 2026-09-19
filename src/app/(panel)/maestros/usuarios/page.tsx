import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { personal, usuarios } from '@/db/schema'
import { BotonLink, Celda, Etiqueta, Fila, Panel, SinDato, Tabla, Titulo, Vacio } from '@/components/ui'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const NOMBRE_ROL: Record<string, string> = {
  admin: 'Admin',
  operaciones: 'Operaciones',
  mantenimiento: 'Mantenimiento',
  consulta: 'Consulta',
}

export default async function Usuarios({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>
}) {
  const sesion = await permisoRequerido('administrar_usuarios')
  const { guardado } = await searchParams

  const filas = await db
    .select({
      id: usuarios.id,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      persona: personal.apellidoNombre,
    })
    .from(usuarios)
    .leftJoin(personal, eq(usuarios.personalId, personal.id))
    .orderBy(asc(usuarios.email))

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-grow px-6 py-5">
      <Titulo
        bajada="Quién puede entrar a la central y con qué permisos"
        accion={<BotonLink href="/maestros/usuarios/nuevo">+ Nuevo usuario</BotonLink>}
      >
        Usuarios
      </Titulo>

      {guardado ? (
        <p className="mb-4 rounded-[5px] bg-[var(--color-verde-suave)] px-3 py-2 text-[13px] text-[var(--color-verde-texto)]">
          Usuario guardado.
        </p>
      ) : null}

      <Panel>
        {filas.length === 0 ? (
          <Vacio>No hay usuarios cargados.</Vacio>
        ) : (
          <Tabla cabeceras={['Correo', 'Rol', 'Persona', 'Estado', '']}>
            {filas.map((u) => (
              <Fila key={u.id}>
                <Celda className="font-medium">
                  <Link href={`/maestros/usuarios/${u.id}`} className="enlace">{u.email}</Link>
                  {u.id === Number(sesion.user.id) ? (
                    <span className="ml-2 text-[11px] text-[var(--color-tenue)]">(vos)</span>
                  ) : null}
                </Celda>
                <Celda>
                  <Etiqueta estilo={u.rol === 'admin' ? 'acento' : 'neutra'}>{NOMBRE_ROL[u.rol]}</Etiqueta>
                </Celda>
                <Celda>{u.persona ?? <SinDato />}</Celda>
                <Celda>
                  {u.activo
                    ? <span className="text-[var(--color-verde-texto)]">Activo</span>
                    : <span className="text-[var(--color-tenue)]">Inactivo</span>}
                </Celda>
                <Celda className="text-right">
                  <Link href={`/maestros/usuarios/${u.id}`} className="enlace text-[12px]">Editar</Link>
                </Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-[12px] text-[var(--color-tenue)]">
        Las contraseñas se guardan con scrypt: no se pueden ver, solo reemplazar.
        Un admin no puede quitarse a sí mismo el rol ni desactivarse, para que
        nunca queden todos afuera.
      </p>
    </main>
  )
}

import Link from 'next/link'
import { Panel, Titulo } from '@/components/ui'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const NOMBRE_ROL: Record<string, string> = {
  admin: 'administrador',
  operaciones: 'operaciones',
  mantenimiento: 'mantenimiento',
  consulta: 'consulta',
}

/**
 * Adonde caen los permisos que el rol no tiene.
 *
 * No alcanza con tirar un Error: en el build de produccion, React borra el
 * mensaje de los errores del servidor y el usuario ve un parrafo sobre digests
 * que no dice nada. Esto lo dice en castellano.
 */
export default async function SinPermiso({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string; volver?: string }>
}) {
  const sesion = await sesionRequerida()
  const { accion, volver } = await searchParams

  const queHacia = accion ? accion.replace(/_/g, ' ') : null

  return (
    <main className="mx-auto w-full max-w-[640px] flex-grow px-6 py-12">
      <Titulo bajada="Tu usuario no tiene ese permiso">No podés entrar acá</Titulo>

      <Panel>
        <div className="space-y-3 p-6 text-[14px]">
          <p>
            Entraste como <strong>{sesion.user.email}</strong>, con rol{' '}
            <strong>{NOMBRE_ROL[sesion.user.rol] ?? sesion.user.rol}</strong>
            {queHacia ? <>, y para <strong>{queHacia}</strong> hace falta otro.</> : '.'}
          </p>
          <p className="text-[var(--color-tenue)]">
            Si tendrías que poder, pedile a un administrador que te cambie el rol
            en Maestros → Usuarios. No es una falla de la aplicación.
          </p>

          <div className="flex items-center gap-4 pt-2">
            <Link href="/" className="enlace font-semibold">Ir al tablero</Link>
            {volver ? <Link href={volver} className="enlace">Volver</Link> : null}
          </div>
        </div>
      </Panel>
    </main>
  )
}

import { signOut } from '@/auth'
import { BarraSuperior } from '@/components/barra-superior'
import { sesionRequerida } from '@/lib/permisos'

/** Todo lo que cuelga de este layout exige sesion. */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await sesionRequerida()

  async function salir() {
    'use server'
    await signOut({ redirectTo: '/ingresar' })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior email={sesion.user.email} salir={salir} />
      {children}
    </div>
  )
}

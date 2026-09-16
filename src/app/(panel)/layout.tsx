import Link from 'next/link'
import { signOut } from '@/auth'
import { sesionRequerida } from '@/lib/permisos'

/** Todo lo que cuelga de este layout exige sesion. */
export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const sesion = await sesionRequerida()

  async function salir() {
    'use server'
    await signOut({ redirectTo: '/ingresar' })
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--color-borde)] bg-[var(--color-panel)]">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-sm font-semibold">
            Central Operativa
          </Link>

          <nav className="flex gap-4 text-sm text-[var(--color-tenue)]">
            <Link href="/" className="hover:text-[var(--color-texto)]">Tablero</Link>
            <Link href="/maestros" className="hover:text-[var(--color-texto)]">Maestros</Link>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-[var(--color-tenue)]">
              {sesion.user.email} · {sesion.user.rol}
            </span>
            <form action={salir}>
              <button type="submit" className="text-[var(--color-acento)] hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}
    </div>
  )
}

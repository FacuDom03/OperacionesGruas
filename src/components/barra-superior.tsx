import Link from 'next/link'
import { Navegacion } from '@/components/navegacion'
import { SelectorEmpresas } from '@/components/selector-empresas'

/**
 * Barra superior del mockup: fondo oscuro, la marca en ámbar, la navegación en
 * condensada mayúscula con la pestaña activa en una pastilla más clara, y a la
 * derecha el selector de empresa, el usuario y su inicial.
 */
function iniciales(email: string) {
  const usuario = email.split('@')[0]
  const partes = usuario.split(/[.\-_]/).filter(Boolean)
  const letras = partes.length >= 2 ? partes[0][0] + partes[1][0] : usuario.slice(0, 2)
  return letras.toUpperCase()
}

export function BarraSuperior({
  email,
  salir,
}: {
  email: string
  salir: () => Promise<void>
}) {
  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-8 bg-[var(--color-barra)] px-6 text-[var(--color-barra-texto)]">
      <Link href="/" className="flex items-baseline gap-2.5 hover:opacity-90">
        <span className="hdg text-[19px] font-bold text-[var(--color-marca)]">Grupo Daniele</span>
        <span className="hdg text-[15px] font-medium text-[#9aa1ab]">Central Operativa</span>
      </Link>

      <Navegacion />

      <div className="flex items-center gap-3 text-[13px] text-[var(--color-apagado)]">
        <SelectorEmpresas />

        <span className="hidden sm:inline">{email}</span>

        <form action={salir}>
          <button
            type="submit"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3a3f48] text-[11px] font-semibold text-white hover:bg-[#4b515b]"
            title="Salir"
          >
            {iniciales(email)}
          </button>
        </form>
      </div>
    </header>
  )
}

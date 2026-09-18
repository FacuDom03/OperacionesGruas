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
    <header className="relative z-20 flex h-14 flex-shrink-0 items-center gap-4 bg-[var(--color-barra)] px-6 text-[var(--color-barra-texto)]">
      <Link href="/" className="flex flex-shrink-0 items-baseline gap-2.5 whitespace-nowrap hover:opacity-90">
        <span className="hdg text-[19px] font-bold text-[var(--color-marca)]">Grupo Daniele</span>
        <span className="hdg hidden text-[15px] font-medium text-[#9aa1ab] 2xl:inline">Central Operativa</span>
      </Link>

      <Navegacion />

      <div className="flex flex-shrink-0 items-center gap-3 whitespace-nowrap text-[13px] text-[var(--color-apagado)]">
        <SelectorEmpresas />

        {/* Solo el usuario y recortado: el correo entero desbordaba la barra. */}
        <span className="hidden max-w-[150px] truncate xl:inline" title={email}>
          {email.split('@')[0]}
        </span>

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

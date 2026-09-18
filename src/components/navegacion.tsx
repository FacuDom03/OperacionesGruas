'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/** Las pestañas de la barra. Es cliente solo para saber cuál está activa. */
const SECCIONES = [
  { href: '/', texto: 'Tablero' },
  { href: '/salidas', texto: 'Salidas de trabajo' },
  { href: '/livianos', texto: 'Vehículos livianos' },
  { href: '/maestros', texto: 'Maestros' },
]

export function Navegacion() {
  const ruta = usePathname()

  return (
    <nav className="flex flex-grow items-center gap-1">
      {SECCIONES.map((s) => {
        const activa = s.href === '/' ? ruta === '/' : ruta.startsWith(s.href)
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`hdg rounded px-3.5 py-2 text-sm ${
              activa
                ? 'bg-[var(--color-barra-activo)] font-semibold text-white'
                : 'text-[var(--color-apagado)] hover:text-white'
            }`}
          >
            {s.texto}
          </Link>
        )
      })}
    </nav>
  )
}

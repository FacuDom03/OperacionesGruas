'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Las pestañas de la barra. Es cliente solo para saber cuál está activa.
 *
 * Con Herramientas son siete y en 1440 no entraban por poco, de ahí el
 * px-2.5. Más angosto que eso la barra se desplaza, que era lo que ya hacía.
 */
const SECCIONES = [
  { href: '/', texto: 'Tablero' },
  { href: '/salidas', texto: 'Salidas de trabajo' },
  { href: '/livianos', texto: 'Vehículos livianos' },
  { href: '/checklists', texto: 'Checklists' },
  { href: '/calendario', texto: 'Calendario' },
  { href: '/herramientas', texto: 'Herramientas' },
  { href: '/maestros', texto: 'Maestros' },
]

export function Navegacion() {
  const ruta = usePathname()

  return (
    <nav className="flex min-w-0 flex-grow items-center gap-0.5 overflow-x-auto">
      {SECCIONES.map((s) => {
        const activa = s.href === '/' ? ruta === '/' : ruta.startsWith(s.href)
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`hdg whitespace-nowrap rounded px-2.5 py-2 text-sm ${
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

'use client'

import { useRouter } from 'next/navigation'
import { sumarDias } from '@/lib/calendario'

/**
 * Selector de día: flechas para moverse de a uno y un calendario que aplica
 * apenas elegís la fecha, sin tener que apretar nada más.
 */
export function NavegadorFecha({
  fecha,
  hoy,
  ruta,
  extra = '',
}: {
  fecha: string
  /** El día de hoy, calculado en el servidor para que no baile con el huso. */
  hoy: string
  /** A dónde navegar, por ejemplo /salidas */
  ruta: string
  /** Otros parámetros a conservar, por ejemplo 'vista=mes' */
  extra?: string
}) {
  const router = useRouter()
  const ir = (f: string) => router.push(`${ruta}?fecha=${f}${extra ? `&${extra}` : ''}`)

  return (
    <div className="flex items-center overflow-hidden rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white">
      <button
        type="button"
        onClick={() => ir(sumarDias(fecha, -1))}
        aria-label="Día anterior"
        className="px-2.5 py-2 text-[13px] text-[var(--color-tenue)] hover:bg-[var(--color-panel-suave)]"
      >
        ‹
      </button>

      <input
        type="date"
        value={fecha}
        onChange={(e) => { if (e.target.value) ir(e.target.value) }}
        className="mono border-x border-[var(--color-borde)] px-2 py-2 text-[13px] outline-none"
      />

      <button
        type="button"
        onClick={() => ir(sumarDias(fecha, 1))}
        aria-label="Día siguiente"
        className="px-2.5 py-2 text-[13px] text-[var(--color-tenue)] hover:bg-[var(--color-panel-suave)]"
      >
        ›
      </button>

      {fecha !== hoy ? (
        <button
          type="button"
          onClick={() => ir(hoy)}
          className="hdg border-l border-[var(--color-borde)] px-2.5 py-2 text-[12px] font-semibold text-[var(--color-acento)] hover:bg-[var(--color-panel-suave)]"
        >
          Hoy
        </button>
      ) : null}
    </div>
  )
}

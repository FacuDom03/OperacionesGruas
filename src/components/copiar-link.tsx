'use client'

import { useEffect, useState } from 'react'

/**
 * El link de confirmación, listo para pegar en WhatsApp. La dirección completa
 * se arma en el navegador porque el servidor no siempre sabe con qué dominio
 * lo están mirando.
 */
export function CopiarLink({ ruta }: { ruta: string }) {
  const [direccion, setDireccion] = useState(ruta)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => { setDireccion(`${window.location.origin}${ruta}`) }, [ruta])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(direccion)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles queda el texto a la vista para copiarlo a mano.
      setCopiado(false)
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={direccion}
        onFocus={(e) => e.currentTarget.select()}
        className="mono min-w-0 flex-grow rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-2.5 py-2 text-[12.5px]"
      />
      <button
        type="button"
        onClick={copiar}
        className="hdg rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 text-[12px] font-semibold"
      >
        {copiado ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}

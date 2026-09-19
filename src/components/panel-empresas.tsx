'use client'

import { useActionState, useRef, useState } from 'react'
import { aplicarEmpresas, type EstadoSelector } from '@/components/acciones-empresas'

export type EmpresaElegible = { id: number; nombre: string }

/**
 * El desplegable del selector. Es cliente para poder mostrar la confirmación
 * después de aplicar, y para que "Ver todas" marque todo y envíe sin recargar.
 */
export function PanelEmpresas({
  lista,
  elegidas,
  resumen,
}: {
  lista: EmpresaElegible[]
  elegidas: number[] | null
  resumen: string
}) {
  const [estado, enviar, enviando] = useActionState<EstadoSelector, FormData>(aplicarEmpresas, {})
  const formulario = useRef<HTMLFormElement>(null)

  // El mensaje es de la última vez que se aplicó: al cerrar y volver a abrir el
  // panel no tiene por qué seguir ahí.
  const [visto, setVisto] = useState(estado)
  const [mostrar, setMostrar] = useState(false)
  if (estado !== visto) {
    setVisto(estado)
    setMostrar(true)
  }

  function marcarTodasYEnviar() {
    formulario.current?.querySelectorAll<HTMLInputElement>('input[name=empresa]')
      .forEach((c) => { c.checked = true })
    formulario.current?.requestSubmit()
  }

  return (
    <details className="relative" onToggle={() => setMostrar(false)}>
      <summary className="cursor-pointer list-none whitespace-nowrap rounded-[5px] border border-[#3a3f48] px-3 py-1.5 text-[13px] hover:bg-[var(--color-barra-activo)]">
        Empresa: <span className="font-semibold text-white">{resumen}</span>{' '}
        <span className="text-[var(--color-apagado)]">▾</span>
      </summary>

      <form
        ref={formulario}
        action={enviar}
        className="absolute right-0 z-30 mt-1 w-72 whitespace-normal rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)] p-3 text-[var(--color-texto)] shadow-lg"
      >
        <p className="mb-2 text-[11px] text-[var(--color-tenue)]">
          Con qué empresas trabajar. Filtra las salidas; los equipos y el personal
          son del grupo y no se filtran.
        </p>

        <div className="max-h-64 space-y-1 overflow-y-auto">
          {lista.map((e) => (
            <label key={e.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-[var(--color-fondo)]">
              <input
                type="checkbox"
                name="empresa"
                value={e.id}
                defaultChecked={elegidas ? elegidas.includes(e.id) : true}
                className="h-4 w-4 accent-[var(--color-acento)]"
              />
              <span className="text-[13px]">{e.nombre}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={enviando}
            className="rounded-[5px] bg-[var(--color-acento)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--color-acento-oscuro)] disabled:opacity-60"
          >
            {enviando ? 'Aplicando…' : 'Aplicar'}
          </button>
          <button
            type="button"
            onClick={marcarTodasYEnviar}
            disabled={enviando}
            className="text-[13px] text-[var(--color-tenue)] hover:underline disabled:opacity-60"
          >
            Ver todas
          </button>
        </div>

        {mostrar && estado.mensaje ? (
          <p className="mt-3 rounded-[4px] bg-[var(--color-verde-suave)] px-2.5 py-2 text-[12px] text-[var(--color-verde-texto)]">
            {estado.mensaje}
          </p>
        ) : null}
      </form>
    </details>
  )
}

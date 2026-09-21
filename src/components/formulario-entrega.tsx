'use client'

import { useState } from 'react'

export type OpcionHerramienta = {
  id: number
  codigo: string
  nombre: string
  donde: string
  tipoCustodia: 'persona' | 'unidad' | 'lugar'
}

const ENTRADA =
  'w-full rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--color-acento)]'

/**
 * El acta de entrega. Es cliente para dos cosas: filtrar la lista mientras se
 * escribe, y avisar cuando lo que se entrega ya lo tiene otro. Ese aviso no
 * bloquea, igual que el solapamiento de personal en las salidas.
 */
export function FormularioEntrega({
  destinos,
  herramientas,
  elegidasAlAbrir,
}: {
  destinos: { valor: string; texto: string; grupo: string }[]
  herramientas: OpcionHerramienta[]
  elegidasAlAbrir: number[]
}) {
  const [destino, setDestino] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [elegidas, setElegidas] = useState<number[]>(elegidasAlAbrir)

  const patron = busqueda.trim().toLowerCase()
  const visibles = patron
    ? herramientas.filter((h) =>
      `${h.codigo} ${h.nombre} ${h.donde}`.toLowerCase().includes(patron))
    : herramientas

  const alternar = (id: number) => {
    setElegidas((antes) => antes.includes(id) ? antes.filter((x) => x !== id) : [...antes, id])
  }

  const seleccionadas = herramientas.filter((h) => elegidas.includes(h.id))
  const queTieneOtro = seleccionadas.filter((h) => h.tipoCustodia === 'persona')
  const grupos = [...new Set(destinos.map((d) => d.grupo))]

  return (
    <div className="space-y-5">
      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">A quién se la entregás</span>
        <select
          name="destino"
          value={destino}
          onChange={(e) => setDestino(e.target.value)}
          className={`mt-1 ${ENTRADA}`}
        >
          <option value="">Elegí una persona, una unidad o un lugar</option>
          {grupos.map((g) => (
            <optgroup key={g} label={g}>
              {destinos.filter((d) => d.grupo === g).map((d) => (
                <option key={d.valor} value={d.valor}>{d.texto}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-[11px] text-[var(--color-tenue)]">
          Si el destino es un lugar, queda registrado como devolución.
        </span>
      </label>

      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <span className="hdg text-[12px] font-semibold text-[var(--color-tenue)]">
            Qué herramientas ({elegidas.length} elegidas)
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="buscar por código o nombre"
            className="w-[240px] rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-acento)]"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto rounded-[5px] border border-[var(--color-borde)]">
          {visibles.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-[var(--color-tenue)]">
              No hay herramientas que coincidan.
            </p>
          ) : visibles.map((h) => (
            <label
              key={h.id}
              className="flex cursor-pointer items-center gap-3 border-b border-[var(--color-borde)] px-3 py-2 last:border-0 hover:bg-[var(--color-panel-suave)]"
            >
              <input
                type="checkbox"
                name="herramientas"
                value={h.id}
                checked={elegidas.includes(h.id)}
                onChange={() => alternar(h.id)}
                className="h-4 w-4 accent-[var(--color-acento)]"
              />
              <span className="mono w-[76px] flex-shrink-0 text-[12.5px]">{h.codigo}</span>
              <span className="flex-grow text-[13px]">{h.nombre}</span>
              <span className="text-[11.5px] text-[var(--color-tenue)]">{h.donde}</span>
            </label>
          ))}
        </div>
      </div>

      {queTieneOtro.length > 0 ? (
        <div className="rounded-[5px] border border-[var(--color-acento)] bg-[var(--color-acento-suave)] px-3 py-2 text-[12.5px] text-[var(--color-acento-oscuro)]">
          Ojo: {queTieneOtro.length === 1 ? 'una de las elegidas la tiene' : 'algunas de las elegidas las tienen'} otra
          persona ahora mismo ({queTieneOtro.map((h) => `${h.codigo} — ${h.donde}`).join(', ')}).
          Se puede guardar igual: queda el cambio de manos en el historial.
        </div>
      ) : null}

      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">Observaciones</span>
        <input name="observaciones" className={`mt-1 ${ENTRADA}`} placeholder="para qué se la lleva, hasta cuándo..." />
      </label>
    </div>
  )
}

'use client'

const ENTRADA =
  'rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-acento)]'

const ETIQUETA = 'hdg block text-[12px] font-semibold text-[var(--color-tenue)]'

/**
 * Filtros de la búsqueda. Form GET: el texto se aplica con Enter, los
 * desplegables y las fechas solos, como en el resto de la app.
 */
export function FiltrosBusqueda({
  texto, desde, hasta, estado,
}: {
  texto: string
  desde: string
  hasta: string
  estado: string
}) {
  const aplicar = (e: { currentTarget: { form: HTMLFormElement | null } }) => {
    e.currentTarget.form?.requestSubmit()
  }

  return (
    <form method="get" action="/salidas/buscar" className="mb-4 flex flex-wrap items-end gap-2">
      <label className="block">
        <span className={ETIQUETA}>Buscar</span>
        <input
          type="search"
          name="q"
          defaultValue={texto}
          autoFocus
          placeholder="número, cliente, OT, remito, unidad, lugar, persona..."
          className={`mt-1 w-[340px] ${ENTRADA}`}
        />
      </label>

      <label className="block">
        <span className={ETIQUETA}>Desde</span>
        <input type="date" name="desde" defaultValue={desde} onChange={aplicar} className={`mono mt-1 ${ENTRADA}`} />
      </label>

      <label className="block">
        <span className={ETIQUETA}>Hasta</span>
        <input type="date" name="hasta" defaultValue={hasta} onChange={aplicar} className={`mono mt-1 ${ENTRADA}`} />
      </label>

      <label className="block">
        <span className={ETIQUETA}>Estado</span>
        <select name="estado" defaultValue={estado} onChange={aplicar} className={`mt-1 ${ENTRADA}`}>
          <option value="">Todos</option>
          <option value="a_confirmar">A confirmar</option>
          <option value="en_ejecucion">En ejecución</option>
          <option value="finalizado">Finalizado</option>
          <option value="anulado">Anulado</option>
        </select>
      </label>

      <button type="submit" className="hdg px-1 py-2.5 text-[12px] font-semibold text-[var(--color-acento)]">
        Buscar
      </button>

      {texto || desde || hasta || estado ? (
        <a href="/salidas/buscar" className="hdg px-1 py-2.5 text-[12px] font-semibold text-[var(--color-tenue)]">
          Limpiar
        </a>
      ) : null}
    </form>
  )
}

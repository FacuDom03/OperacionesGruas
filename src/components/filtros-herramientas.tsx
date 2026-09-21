'use client'

const ENTRADA =
  'rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-acento)]'

const ETIQUETA = 'hdg block text-[12px] font-semibold text-[var(--color-tenue)]'

/**
 * Filtros del panel de herramientas. Es un form GET: el texto se aplica con
 * Enter y los desplegables solos, sin botón, como en el resto de la app.
 */
export function FiltrosHerramientas({
  texto, estado, donde, sinConfirmar,
}: {
  texto: string
  estado: string
  donde: string
  sinConfirmar: boolean
}) {
  const aplicar = (e: { currentTarget: { form: HTMLFormElement | null } }) => {
    e.currentTarget.form?.requestSubmit()
  }

  return (
    <form method="get" action="/herramientas" className="mb-4 flex flex-wrap items-end gap-2">
      <label className="block">
        <span className={ETIQUETA}>Buscar</span>
        <input
          type="search"
          name="texto"
          defaultValue={texto}
          placeholder="código, nombre, marca, quién la tiene..."
          className={`mt-1 w-[260px] ${ENTRADA}`}
        />
      </label>

      <label className="block">
        <span className={ETIQUETA}>Estado</span>
        <select name="estado" defaultValue={estado} onChange={aplicar} className={`mt-1 ${ENTRADA}`}>
          <option value="">Todos</option>
          <option value="activa">Activa</option>
          <option value="en_reparacion">En reparación</option>
          <option value="perdida">Perdida</option>
          <option value="baja">De baja</option>
        </select>
      </label>

      <label className="block">
        <span className={ETIQUETA}>Dónde está</span>
        <select name="donde" defaultValue={donde} onChange={aplicar} className={`mt-1 ${ENTRADA}`}>
          <option value="">En cualquier lado</option>
          <option value="persona">La tiene alguien</option>
          <option value="unidad">Arriba de una unidad</option>
          <option value="lugar">Guardada en un lugar</option>
        </select>
      </label>

      <label className="flex items-center gap-2 py-2.5 text-[13px]">
        <input
          type="checkbox"
          name="sinConfirmar"
          defaultChecked={sinConfirmar}
          onChange={aplicar}
          className="h-4 w-4 accent-[var(--color-acento)]"
        />
        Sin confirmar
      </label>

      <button type="submit" className="hdg px-1 py-2.5 text-[12px] font-semibold text-[var(--color-acento)]">
        Buscar
      </button>

      {texto || estado || donde || sinConfirmar ? (
        <a href="/herramientas" className="hdg px-1 py-2.5 text-[12px] font-semibold text-[var(--color-tenue)]">
          Limpiar
        </a>
      ) : null}
    </form>
  )
}

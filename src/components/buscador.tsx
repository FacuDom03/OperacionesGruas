/**
 * Busqueda por GET: escribe el texto en la query de la URL. Sin estado del lado
 * del cliente, asi el resultado se puede compartir o recargar sin perderlo.
 */
export function Buscador({ placeholder, valor }: { placeholder: string; valor?: string }) {
  return (
    <form className="mb-4 flex gap-2">
      <input
        name="q"
        defaultValue={valor ?? ''}
        placeholder={placeholder}
        className="w-full max-w-md rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
      />
      <button
        type="submit"
        className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]"
      >
        Buscar
      </button>
    </form>
  )
}

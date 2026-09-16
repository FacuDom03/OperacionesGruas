'use client'

/**
 * Pantalla de error del panel. Lo mas comun que cae aca es un permiso que el
 * rol no tiene: se muestra el motivo en castellano en vez de una pantalla rota.
 */
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-xl font-semibold tracking-tight">No se pudo mostrar la pagina</h1>
      <p className="mt-2 text-sm text-[var(--color-tenue)]">{error.message}</p>

      <button
        onClick={reset}
        className="mt-6 rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]"
      >
        Reintentar
      </button>
    </main>
  )
}

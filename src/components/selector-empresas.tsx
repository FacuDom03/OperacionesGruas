import { revalidatePath } from 'next/cache'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas } from '@/db/schema'
import { empresasElegidas, guardarEmpresasElegidas } from '@/lib/empresas-elegidas'

/**
 * Selector de empresas de la cabecera. Usa <details> para desplegarse, que es
 * HTML puro: no necesita javascript del lado del cliente.
 */
export async function SelectorEmpresas() {
  const [lista, elegidas] = await Promise.all([
    db.select().from(empresas).where(eq(empresas.activa, true)).orderBy(asc(empresas.nombreCorto)),
    empresasElegidas(),
  ])

  async function aplicar(datos: FormData) {
    'use server'
    const ids = datos.getAll('empresa').map(Number).filter(Boolean)
    // Elegirlas todas es lo mismo que no filtrar.
    await guardarEmpresasElegidas(ids.length === lista.length ? [] : ids)
    revalidatePath('/', 'layout')
  }

  async function verTodas() {
    'use server'
    await guardarEmpresasElegidas([])
    revalidatePath('/', 'layout')
  }

  const nombres = lista.filter((e) => elegidas?.includes(e.id)).map((e) => e.nombreCorto)
  const resumen =
    !elegidas ? 'Todas las empresas'
      : nombres.length === 1 ? nombres[0]
        : `${nombres.length} empresas`

  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-md border border-[var(--color-borde)] px-3 py-1.5 text-sm hover:bg-[var(--color-fondo)]">
        {resumen} <span className="text-[var(--color-tenue)]">▾</span>
      </summary>

      <form
        action={aplicar}
        className="absolute right-0 z-10 mt-1 w-72 rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)] p-3 shadow-lg"
      >
        <p className="mb-2 text-xs text-[var(--color-tenue)]">
          Con que empresas trabajar. Filtra las salidas; los equipos y el personal
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
                className="h-4 w-4"
              />
              <span className="text-sm">{e.nombreCorto}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-[var(--color-acento)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Aplicar
          </button>
          <button
            type="submit"
            formAction={verTodas}
            className="text-sm text-[var(--color-tenue)] hover:underline"
          >
            Ver todas
          </button>
        </div>
      </form>
    </details>
  )
}

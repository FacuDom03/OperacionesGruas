import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas } from '@/db/schema'
import { PanelEmpresas } from '@/components/panel-empresas'
import { empresasElegidas } from '@/lib/empresas-elegidas'

/** Selector de empresas de la cabecera. Lee la lista y delega el panel. */
export async function SelectorEmpresas() {
  const [lista, elegidas] = await Promise.all([
    db
      .select({ id: empresas.id, nombre: empresas.nombreCorto })
      .from(empresas)
      .where(eq(empresas.activa, true))
      .orderBy(asc(empresas.nombreCorto)),
    empresasElegidas(),
  ])

  const nombres = lista.filter((e) => elegidas?.includes(e.id)).map((e) => e.nombre)
  const resumen =
    !elegidas ? `Todas (${lista.length})`
      : nombres.length === 1 ? nombres[0]
        : `${nombres.length} empresas`

  return <PanelEmpresas lista={lista} elegidas={elegidas} resumen={resumen} />
}

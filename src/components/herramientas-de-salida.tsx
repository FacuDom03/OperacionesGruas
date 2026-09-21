import Link from 'next/link'
import { Celda, Etiqueta, Fila, Panel, Tabla, Vacio } from '@/components/ui'
import { herramientasDeSalida } from '@/lib/herramientas'
import { formatearFechaHora } from '@/lib/formato'

/**
 * Las herramientas que salieron con este trabajo. No viven en la salida: lo que
 * se guarda es la custodia de cada herramienta, y la salida es el momento en
 * que cambio. Por eso una que despues se llevo otro aparece marcada.
 */
export async function HerramientasDeSalida({
  salidaId, puedeEntregar,
}: {
  salidaId: number
  puedeEntregar: boolean
}) {
  const filas = await herramientasDeSalida(salidaId)

  return (
    <div className="mt-6">
      <Panel
        titulo="Herramientas de esta salida"
        extra={puedeEntregar ? (
          <Link href={`/herramientas/entregar?salida=${salidaId}`} className="enlace text-[12.5px] font-semibold">
            Entregar herramientas
          </Link>
        ) : undefined}
      >
        {filas.length === 0 ? (
          <Vacio>
            No salió ninguna herramienta con este trabajo.
            {puedeEntregar ? ' Se cargan con «Entregar herramientas».' : ''}
          </Vacio>
        ) : (
          <Tabla cabeceras={['Código', 'Herramienta', 'Se la llevó', 'Confirmación']}>
            {filas.map((h) => (
              <Fila key={`${h.entregaId}-${h.herramientaId}`}>
                <Celda className="mono">
                  <Link href={`/herramientas/${h.herramientaId}`} className="enlace">{h.codigo}</Link>
                </Celda>
                <Celda>
                  {h.nombre}
                  {!h.sigueEnLaSalida ? (
                    <span className="block text-[11.5px] text-[var(--color-tenue)]">
                      ya se movió de nuevo
                    </span>
                  ) : null}
                </Celda>
                <Celda>{h.haciaPersona ?? h.haciaUnidad ?? h.haciaLugar ?? '—'}</Celda>
                <Celda>
                  {!h.pideConfirmacion ? (
                    <span className="text-[12.5px] text-[var(--color-tenue)]">no hace falta</span>
                  ) : h.confirmadoAt ? (
                    <span className="text-[12.5px] text-[var(--color-verde-texto)]">
                      {formatearFechaHora(h.confirmadoAt)}
                    </span>
                  ) : (
                    <Etiqueta estilo="acento">Sin confirmar</Etiqueta>
                  )}
                </Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>
    </div>
  )
}

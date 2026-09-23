import Link from 'next/link'
import { Celda, Etiqueta, Fila, Panel, SinDato, Tabla, Titulo, Vacio } from '@/components/ui'
import { FiltrosBusqueda } from '@/components/filtros-busqueda'
import { POR_PAGINA, buscarSalidas } from '@/lib/buscar-salidas'
import { empresasElegidas } from '@/lib/empresas-elegidas'
import { formatearFecha, formatearHora } from '@/lib/formato'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO = {
  a_confirmar: { texto: 'A confirmar', estilo: 'neutra' },
  en_ejecucion: { texto: 'En ejecución', estilo: 'acento' },
  finalizado: { texto: 'Finalizado', estilo: 'verde' },
  anulado: { texto: 'Anulado', estilo: 'apagada' },
} as const

export default async function BuscarSalidas({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    desde?: string
    hasta?: string
    estado?: string
    pagina?: string
  }>
}) {
  await sesionRequerida()
  const p = await searchParams

  const texto = (p.q ?? '').trim()
  const desde = p.desde ?? ''
  const hasta = p.hasta ?? ''
  const estado = p.estado ?? ''
  const pagina = Math.max(1, Number(p.pagina) || 1)

  const elegidas = await empresasElegidas()
  const hayFiltro = Boolean(texto || desde || hasta || estado)

  // Sin nada escrito no se trae media base: se muestra la pantalla vacia.
  const resultado = hayFiltro
    ? await buscarSalidas({ texto: texto || undefined, desde: desde || undefined, hasta: hasta || undefined, estado: estado || undefined, empresas: elegidas }, pagina)
    : { filas: [], total: 0, paginas: 1 }

  const params = new URLSearchParams()
  for (const [clave, valor] of Object.entries({ q: texto, desde, hasta, estado })) {
    if (valor) params.set(clave, valor)
  }
  const enlacePagina = (n: number) => {
    const otros = new URLSearchParams(params)
    if (n > 1) otros.set('pagina', String(n))
    return `/salidas/buscar?${otros}`
  }

  const primera = resultado.total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const ultima = Math.min(pagina * POR_PAGINA, resultado.total)

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-6 py-5">
      <Titulo
        bajada="Por número, cliente, OT, remito, unidad, lugar o quién fue"
        accion={<Link href="/salidas" className="enlace text-[13px] font-semibold">Volver al día</Link>}
      >
        Buscar salidas
      </Titulo>

      <FiltrosBusqueda texto={texto} desde={desde} hasta={hasta} estado={estado} />

      {elegidas ? (
        <p className="mb-3 text-[12px] text-[var(--color-tenue)]">
          Buscando solo en las empresas elegidas arriba.
        </p>
      ) : null}

      <Panel>
        {!hayFiltro ? (
          <Vacio>Escribí algo para buscar. Por ejemplo un número de salida, un cliente o un interno.</Vacio>
        ) : resultado.filas.length === 0 ? (
          <Vacio>No se encontró ninguna salida con eso.</Vacio>
        ) : (
          <Tabla cabeceras={['Fecha', 'Hora', 'Unidad', 'N°', 'Cliente / OT', 'Empresa', 'Carga → Descarga', 'Estado']}>
            {resultado.filas.map((s) => {
              const etiqueta = ETIQUETA_ESTADO[s.estado]
              return (
                <Fila key={s.id}>
                  <Celda className="mono whitespace-nowrap font-medium">
                    <Link href={`/salidas?fecha=${s.fecha}`} className="enlace">{formatearFecha(s.fecha)}</Link>
                  </Celda>
                  <Celda className="mono">{formatearHora(s.horaSalida) || <SinDato />}</Celda>
                  <Celda>
                    <Link href={`/salidas/${s.id}`} className="mono font-semibold">{s.interno}</Link>
                    <div className="text-[11px] text-[var(--color-tenue)]">
                      {[s.marca, s.modelo].filter(Boolean).join(' ')}
                    </div>
                  </Celda>
                  <Celda className="mono text-[var(--color-tenue)]">
                    <Link href={`/salidas/${s.id}`} className="enlace">{s.numero}</Link>
                  </Celda>
                  <Celda>
                    <div className="font-medium">{s.cliente ?? <SinDato />}</div>
                    {s.ot ? <div className="mono text-[11px] text-[var(--color-tenue)]">OT {s.ot}</div> : null}
                  </Celda>
                  <Celda>{s.empresa}</Celda>
                  <Celda className="text-[var(--color-tenue)]">
                    {s.lugarCarga || s.lugarDescarga
                      ? `${s.lugarCarga ?? '—'} → ${s.lugarDescarga ?? '—'}`
                      : <SinDato />}
                  </Celda>
                  <Celda><Etiqueta estilo={etiqueta.estilo}>{etiqueta.texto}</Etiqueta></Celda>
                </Fila>
              )
            })}
          </Tabla>
        )}
      </Panel>

      {resultado.total > 0 ? (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-[var(--color-tenue)]">
          <span>{primera}–{ultima} de {resultado.total}</span>
          {resultado.paginas > 1 ? (
            <div className="flex items-center gap-3">
              {pagina > 1 ? <Link href={enlacePagina(pagina - 1)} className="enlace">‹ Anterior</Link> : null}
              <span>Página {pagina} de {resultado.paginas}</span>
              {pagina < resultado.paginas ? <Link href={enlacePagina(pagina + 1)} className="enlace">Siguiente ›</Link> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}

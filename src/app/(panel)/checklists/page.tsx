import Link from 'next/link'
import { marcarRevisado } from './acciones'
import { Boton, Panel, SinDato, Titulo, Vacio } from '@/components/ui'
import { formatearFecha, formatearFechaHora, hoy } from '@/lib/formato'
import { detalleDeChecklist, resumenDelDia } from '@/lib/consultas-checklists'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

/** Resumen de checklists del día (capítulo 6 del spec, pantalla 5). */
export default async function Checklists({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; ver?: string; filtro?: string }>
}) {
  const sesion = await sesionRequerida()
  const { fecha: fechaBuscada, ver, filtro } = await searchParams
  const fecha = fechaBuscada ?? hoy()

  const resumen = await resumenDelDia(fecha)

  const visibles =
    filtro === 'observacion' ? resumen.recibidos.filter((r) => r.resultado === 'con_observacion')
      : filtro === 'pendientes' ? []
        : resumen.recibidos

  const elegido = ver ? await detalleDeChecklist(Number(ver)) : null
  const puedeRevisar = puede(sesion.user.rol, 'revisar_checklists')

  const enlace = (extra: Record<string, string>) => {
    const p = new URLSearchParams({ fecha, ...(filtro ? { filtro } : {}), ...extra })
    return `/checklists?${p.toString()}`
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-6 py-5">
      <Titulo
        bajada={<>Recibidos por WhatsApp vía n8n · {formatearFecha(fecha)}</>}
        accion={
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="fecha"
              defaultValue={fecha}
              className="mono rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 text-[13px]"
            />
            <button type="submit" className="rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 text-[13px] font-semibold hover:bg-[var(--color-panel-suave)]">
              Ver
            </button>
          </form>
        }
      >
        Resumen de checklists
      </Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          { n: `${resumen.recibidos.length}`, sobre: `${resumen.esperados}`, t: 'recibidos', color: '' },
          { n: `${resumen.sinNovedad}`, t: 'sin novedad', color: 'text-[var(--color-verde-texto)]' },
          { n: `${resumen.conObservacion}`, t: 'con observación', color: 'text-[var(--color-acento)]' },
          { n: `${resumen.pendientes.length}`, t: 'pendientes', color: '' },
        ].map((k) => (
          <div key={k.t} className="flex items-baseline gap-2.5 rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)] px-4 py-3.5">
            <span className={`mono text-[26px] font-semibold leading-none ${k.color}`}>
              {k.n}
              {k.sobre ? <span className="text-[17px] text-[var(--color-tenue-2)]">/{k.sobre}</span> : null}
            </span>
            <span className="hdg text-[13px] font-semibold text-[var(--color-tenue)]">{k.t}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel
          titulo="Checklists del día"
          extra={
            <div className="flex items-center gap-1 text-[12px]">
              {[
                { clave: '', texto: 'Todos' },
                { clave: 'observacion', texto: 'Con observación' },
                { clave: 'pendientes', texto: 'Pendientes' },
              ].map((f) => (
                <Link
                  key={f.clave}
                  href={`/checklists?fecha=${fecha}${f.clave ? `&filtro=${f.clave}` : ''}`}
                  className={`hdg rounded-[3px] px-2 py-1 font-semibold ${
                    (filtro ?? '') === f.clave
                      ? 'bg-[var(--color-neutro-suave)] text-[var(--color-texto)]'
                      : 'text-[var(--color-tenue-2)]'
                  }`}
                >
                  {f.texto}
                </Link>
              ))}
            </div>
          }
        >
          {visibles.length === 0 && (filtro === 'pendientes' || resumen.recibidos.length === 0) ? null : null}

          <ul className="divide-y divide-[var(--color-borde)]">
            {visibles.map((r) => {
              const observado = r.resultado === 'con_observacion'
              return (
                <li key={r.id}>
                  <Link
                    href={enlace({ ver: String(r.id) })}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-panel-suave)] ${
                      elegido?.id === r.id ? 'bg-[var(--color-panel-suave)]' : ''
                    } ${observado ? 'border-l-[3px] border-l-[var(--color-acento)]' : ''}`}
                  >
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[4px] text-[13px] font-bold ${
                        observado
                          ? 'bg-[var(--color-acento-suave)] text-[var(--color-acento)]'
                          : 'bg-[var(--color-verde-suave)] text-[var(--color-verde-texto)]'
                      }`}
                    >
                      {observado ? '!' : '✓'}
                    </span>
                    <span className="flex-grow">
                      <span className="mono text-[13px] font-semibold">{r.interno}</span>
                      <span className="text-[13px]"> — {[r.marca, r.modelo].filter(Boolean).join(' ')}</span>
                      <span className="block text-[12px] text-[var(--color-tenue)]">
                        {r.persona ?? 'sin identificar'} ·{' '}
                        {observado ? 'con observación' : 'sin novedad'}
                        {r.revisadoAt ? ' · revisado' : ''}
                      </span>
                    </span>
                    <span className="mono text-[12px] text-[var(--color-tenue)]">
                      {r.recibidoAt ? formatearFechaHora(r.recibidoAt).slice(-5) : ''}
                    </span>
                  </Link>
                </li>
              )
            })}

            {(filtro ?? '') !== 'observacion' && resumen.pendientes.map((p) => (
              <li key={p.equipoId} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[4px] bg-[var(--color-neutro-suave)] text-[13px] text-[var(--color-tenue-2)]">
                  ·
                </span>
                <span className="flex-grow text-[var(--color-tenue)]">
                  <span className="mono text-[13px] font-semibold">{p.interno}</span>
                  <span className="text-[13px]"> — {[p.marca, p.modelo].filter(Boolean).join(' ')}</span>
                  <span className="block text-[12px]">esperando respuesta</span>
                </span>
                <span className="hdg rounded-[3px] bg-[var(--color-neutro-suave)] px-2 py-0.5 text-[11.5px] font-semibold text-[var(--color-neutro-texto)]">
                  Pendiente
                </span>
              </li>
            ))}
          </ul>

          {resumen.recibidos.length === 0 && resumen.pendientes.length === 0 ? (
            <Vacio>
              No hay checklists ni unidades con salida ese día.
            </Vacio>
          ) : null}

          <p className="border-t border-[var(--color-borde)] px-4 py-2.5 text-[12px] text-[var(--color-tenue)]">
            {resumen.recibidos.length} de {resumen.esperados} unidades con checklist previsto.
          </p>
        </Panel>

        {elegido ? (
          <Panel
            titulo={`${elegido.interno} — ${[elegido.marca, elegido.modelo].filter(Boolean).join(' ')}`}
            extra={
              <span className={`hdg rounded-[3px] px-2 py-0.5 text-[11.5px] font-semibold ${
                elegido.resultado === 'con_observacion'
                  ? 'bg-[var(--color-acento-suave)] text-[var(--color-acento-oscuro)]'
                  : 'bg-[var(--color-verde-suave)] text-[var(--color-verde-texto)]'
              }`}>
                {elegido.resultado === 'con_observacion' ? 'Con observación' : 'Sin novedad'}
              </span>
            }
          >
            <div className="px-4 py-3 text-[12px] text-[var(--color-tenue)]">
              {elegido.persona ?? 'sin identificar'} ·{' '}
              <span className="mono">{formatearFechaHora(elegido.recibidoAt)}</span>
              {elegido.telefono ? <> · WhatsApp <span className="mono">{elegido.telefono}</span></> : null}
            </div>

            <div className="border-t border-[var(--color-borde)] px-4 py-3">
              <h3 className="hdg mb-2 text-[13px] font-semibold text-[var(--color-tenue)]">Ítems verificados</h3>
              {elegido.items.length === 0 ? (
                <p className="text-[13px] text-[var(--color-tenue)]">El flujo no mandó ítems.</p>
              ) : (
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {elegido.items.map((i) => (
                    <li key={i.id} className="flex items-baseline gap-2 text-[13px]">
                      <span className={i.ok === false ? 'text-[var(--color-acento)]' : 'text-[var(--color-verde-texto)]'}>
                        {i.ok === false ? '✕' : '✓'}
                      </span>
                      <span className={i.ok === false ? 'font-semibold text-[var(--color-acento)]' : ''}>
                        {i.item}
                        {i.comentario ? <span className="text-[var(--color-tenue)]"> — {i.comentario}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-[var(--color-borde)] px-4 py-3">
              <h3 className="hdg mb-2 text-[13px] font-semibold text-[var(--color-tenue)]">Observaciones del chofer</h3>
              {elegido.observaciones ? (
                <p className="rounded-[4px] bg-[var(--color-panel-suave)] px-3 py-2.5 text-[13px]">
                  «{elegido.observaciones}»
                </p>
              ) : (
                <p className="text-[13px] text-[var(--color-tenue)]">Sin observaciones.</p>
              )}

              {elegido.adjuntos.length > 0 ? (
                <p className="mt-2 text-[12px] text-[var(--color-tenue)]">
                  {elegido.adjuntos.length} {elegido.adjuntos.length === 1 ? 'foto enviada' : 'fotos enviadas'} por WhatsApp:{' '}
                  {elegido.adjuntos.map((a, i) => (
                    <a key={a.id} href={a.url} target="_blank" className="enlace mono">
                      {i + 1}{i < elegido.adjuntos.length - 1 ? ', ' : ''}
                    </a>
                  ))}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-3 border-t border-[var(--color-borde)] px-4 py-3">
              {elegido.revisadoAt ? (
                <span className="text-[13px] text-[var(--color-verde-texto)]">
                  Revisado el <span className="mono">{formatearFechaHora(elegido.revisadoAt)}</span>.
                </span>
              ) : puedeRevisar ? (
                <form action={marcarRevisado}>
                  <input type="hidden" name="id" value={elegido.id} />
                  <input type="hidden" name="fecha" value={fecha} />
                  <Boton type="submit" estilo="blanco">Marcar como revisado</Boton>
                </form>
              ) : (
                <span className="text-[13px] text-[var(--color-tenue)]">
                  Lo marca como revisado mantenimiento o un admin.
                </span>
              )}
            </div>
          </Panel>
        ) : (
          <Panel titulo="Detalle">
            <Vacio>Elegí un checklist de la lista para ver sus ítems y las fotos.</Vacio>
          </Panel>
        )}
      </div>
    </main>
  )
}

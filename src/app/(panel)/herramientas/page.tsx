import Link from 'next/link'
import { BotonLink, Celda, Etiqueta, Fila, Panel, SinDato, Tabla, Tarjeta, Titulo, Vacio } from '@/components/ui'
import { FiltrosHerramientas } from '@/components/filtros-herramientas'
import { CopiarLink } from '@/components/copiar-link'
import { alertasDeHerramientas, custodiaDe, diasEnCustodia, listadoDeHerramientas } from '@/lib/herramientas'
import { formatearFecha } from '@/lib/formato'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO = {
  activa: { texto: 'Activa', estilo: 'verde' },
  en_reparacion: { texto: 'En reparación', estilo: 'acento' },
  perdida: { texto: 'Perdida', estilo: 'acento' },
  baja: { texto: 'De baja', estilo: 'apagada' },
} as const

const ICONO_CUSTODIA = { persona: 'Tiene', unidad: 'Arriba de', lugar: 'En' } as const

export default async function Herramientas({
  searchParams,
}: {
  searchParams: Promise<{
    texto?: string
    estado?: string
    donde?: string
    sinConfirmar?: string
    guardada?: string
    token?: string
    entrega?: string
    rechazadas?: string
  }>
}) {
  const sesion = await sesionRequerida()
  const p = await searchParams

  const donde = p.donde === 'persona' || p.donde === 'unidad' || p.donde === 'lugar' ? p.donde : undefined

  const [filas, alertas] = await Promise.all([
    listadoDeHerramientas({
      texto: p.texto?.trim() || undefined,
      estado: p.estado,
      donde,
      sinConfirmar: p.sinConfirmar === 'on',
    }),
    alertasDeHerramientas(),
  ])

  const mueve = puede(sesion.user.rol, 'mover_herramientas')
  const edita = puede(sesion.user.rol, 'editar_maestros')

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-grow px-6 py-5">
      <Titulo
        bajada="Dónde está cada herramienta y quién la tiene"
        accion={
          <>
            {mueve ? <BotonLink href="/herramientas/entregar">Entregar</BotonLink> : null}
            {edita ? <BotonLink href="/herramientas/nueva" estilo="blanco">+ Nueva</BotonLink> : null}
          </>
        }
      >
        Herramientas
      </Titulo>

      {p.entrega && p.token ? (
        <div className="mb-4 rounded-[5px] border border-[var(--color-acento)] bg-[var(--color-acento-suave)] px-4 py-3">
          <p className="text-[13px] font-semibold text-[var(--color-acento-oscuro)]">
            Entrega registrada. Mandale este link al empleado para que confirme:
          </p>
          <CopiarLink ruta={`/confirmar/${p.token}`} />
          <p className="mt-2 text-[12px] text-[var(--color-acento-oscuro)]">
            Se muestra una sola vez. Cuando n8n esté conectado, el mensaje sale solo.
          </p>
        </div>
      ) : p.entrega ? (
        <p className="mb-4 rounded-[5px] bg-[var(--color-verde-suave)] px-3 py-2 text-[13px] text-[var(--color-verde-texto)]">
          Entrega registrada. No hace falta confirmación: no la recibió una persona.
        </p>
      ) : null}

      {p.rechazadas ? (
        <p className="mb-4 rounded-[5px] bg-[var(--color-acento-suave)] px-3 py-2 text-[13px] text-[var(--color-acento-oscuro)]">
          No se movieron: {p.rechazadas}
        </p>
      ) : null}

      {p.guardada ? (
        <p className="mb-4 rounded-[5px] bg-[var(--color-verde-suave)] px-3 py-2 text-[13px] text-[var(--color-verde-texto)]">
          Herramienta guardada.
        </p>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tarjeta etiqueta="Herramientas" valor={filas.length} detalle="con los filtros de abajo" franja="oscura" />
        <Tarjeta etiqueta="Las tiene alguien" valor={alertas.enPersonas} detalle="fuera del depósito" franja="neutra" />
        <Tarjeta
          etiqueta="Sin confirmar"
          valor={alertas.sinConfirmar}
          detalle={alertas.sinConfirmar > 0 ? 'nadie acusó recibo' : 'todas confirmadas'}
          franja={alertas.sinConfirmar > 0 ? 'acento' : 'verde'}
        />
        <Tarjeta
          etiqueta="Hace más de 30 días"
          valor={alertas.hace30Dias}
          detalle={alertas.hace30Dias > 0 ? 'sin devolver' : 'ninguna atrasada'}
          franja={alertas.hace30Dias > 0 ? 'acento' : 'verde'}
        />
      </div>

      <FiltrosHerramientas
        texto={p.texto ?? ''}
        estado={p.estado ?? ''}
        donde={p.donde ?? ''}
        sinConfirmar={p.sinConfirmar === 'on'}
      />

      <Panel>
        {filas.length === 0 ? (
          <Vacio>
            {p.texto || p.estado || p.donde || p.sinConfirmar
              ? 'No hay herramientas con esos filtros.'
              : 'Todavía no hay herramientas cargadas.'}
          </Vacio>
        ) : (
          <Tabla cabeceras={['Código', 'Herramienta', 'Dónde está', 'Desde', 'Estado', '']}>
            {filas.map((h) => {
              const custodia = custodiaDe(h)
              const dias = diasEnCustodia(h.custodiaDesde)
              const sinConfirmar = h.pideConfirmacion && h.confirmadoAt === null
              const estado = ETIQUETA_ESTADO[h.estado]
              return (
                <Fila key={h.id} destacada={sinConfirmar}>
                  <Celda className="mono font-medium">
                    <Link href={`/herramientas/${h.id}`} className="enlace">{h.codigo}</Link>
                  </Celda>
                  <Celda>
                    {h.nombre}
                    {h.marca || h.modelo ? (
                      <span className="block text-[11.5px] text-[var(--color-tenue)]">
                        {[h.marca, h.modelo].filter(Boolean).join(' ')}
                      </span>
                    ) : null}
                  </Celda>
                  <Celda>
                    <span className="text-[11.5px] text-[var(--color-tenue)]">{ICONO_CUSTODIA[custodia.tipo]} </span>
                    {custodia.enlace
                      ? <Link href={custodia.enlace} className="enlace">{custodia.nombre}</Link>
                      : custodia.nombre}
                    {sinConfirmar ? (
                      <span className="hdg ml-2 text-[11px] font-semibold text-[var(--color-acento)]">
                        sin confirmar
                      </span>
                    ) : null}
                  </Celda>
                  <Celda className="mono whitespace-nowrap text-[12.5px]">
                    {formatearFecha(h.custodiaDesde)}
                    <span className="ml-1 text-[var(--color-tenue)]">
                      ({dias === 0 ? 'hoy' : dias === 1 ? '1 día' : `${dias} días`})
                    </span>
                  </Celda>
                  <Celda><Etiqueta estilo={estado.estilo}>{estado.texto}</Etiqueta></Celda>
                  <Celda className="text-right">
                    <Link href={`/herramientas/${h.id}`} className="enlace text-[12px]">Ver</Link>
                  </Celda>
                </Fila>
              )
            })}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-[12px] text-[var(--color-tenue)]">
        Una herramienta está siempre en un solo lado. Para cambiarla de mano o
        de lugar se registra un movimiento: así queda el historial de quién la tuvo.
      </p>
    </main>
  )
}

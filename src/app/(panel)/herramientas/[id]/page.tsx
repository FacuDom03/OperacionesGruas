import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { empresas, equipos, lugares, personal } from '@/db/schema'
import { guardarHerramienta } from '../acciones'
import {
  Boton, Campo, Celda, Etiqueta, Fila, Panel, Seleccion, SinDato, Tabla, Titulo, Vacio,
} from '@/components/ui'
import { custodiaDe, diasEnCustodia, escribirDestino, herramienta, historialDeHerramienta } from '@/lib/herramientas'
import { formatearFecha, formatearFechaHora } from '@/lib/formato'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO = {
  activa: { texto: 'Activa', estilo: 'verde' },
  en_reparacion: { texto: 'En reparación', estilo: 'acento' },
  perdida: { texto: 'Perdida', estilo: 'acento' },
  baja: { texto: 'De baja', estilo: 'apagada' },
} as const

const ICONO_CUSTODIA = { persona: 'La tiene', unidad: 'Arriba de', lugar: 'Guardada en' } as const

/** De dónde a dónde fue un movimiento, en texto. */
function lado(persona: string | null, unidad: string | null, lugar: string | null) {
  return persona ?? unidad ?? lugar ?? '—'
}

export default async function FichaHerramienta({
  params, searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const sesion = await sesionRequerida()
  const { id } = await params
  const { error } = await searchParams
  const esNueva = id === 'nueva'

  const ficha = esNueva ? null : await herramienta(Number(id))
  if (!esNueva && !ficha) notFound()

  const edita = puede(sesion.user.rol, 'editar_maestros')
  const mueve = puede(sesion.user.rol, 'mover_herramientas')

  const [listaEmpresas, listaPersonal, listaEquipos, listaLugares, historial] = await Promise.all([
    db.select().from(empresas).orderBy(asc(empresas.nombreCorto)),
    esNueva ? db.select().from(personal).orderBy(asc(personal.apellidoNombre)) : Promise.resolve([]),
    esNueva ? db.select().from(equipos).orderBy(asc(equipos.interno)) : Promise.resolve([]),
    esNueva ? db.select().from(lugares).orderBy(asc(lugares.nombre)) : Promise.resolve([]),
    esNueva ? Promise.resolve([]) : historialDeHerramienta(Number(id)),
  ])

  // En el alta hay que decir dónde está; después se mueve con una entrega.
  const opcionesCustodia = [
    ...listaLugares.map((l) => ({ valor: escribirDestino({ tipo: 'lugar', id: l.id }), texto: `Lugar — ${l.nombre}` })),
    ...listaEquipos.map((e) => ({ valor: escribirDestino({ tipo: 'unidad', id: e.id }), texto: `Unidad — ${e.interno}` })),
    ...listaPersonal.map((p) => ({ valor: escribirDestino({ tipo: 'persona', id: p.id }), texto: `Persona — ${p.apellidoNombre}` })),
  ]

  const custodia = ficha ? custodiaDe(ficha) : null
  const sinConfirmar = ficha ? ficha.pideConfirmacion && ficha.confirmadoAt === null : false

  return (
    <main className="mx-auto w-full max-w-[900px] flex-grow px-6 py-5">
      <Link href="/herramientas" className="enlace text-[12.5px]">‹ Volver a herramientas</Link>

      <div className="mt-2">
        <Titulo
          bajada={ficha ? [ficha.marca, ficha.modelo, ficha.numeroSerie ? `serie ${ficha.numeroSerie}` : null].filter(Boolean).join(' · ') || undefined : undefined}
          accion={
            ficha && mueve
              ? <Link href={`/herramientas/entregar?herramienta=${ficha.id}`} className="enlace text-[13px] font-semibold">Entregar o devolver</Link>
              : undefined
          }
        >
          {ficha ? `${ficha.codigo} — ${ficha.nombre}` : 'Nueva herramienta'}
        </Titulo>
      </div>

      {error ? (
        <p className="mb-4 rounded-[5px] bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      {ficha && custodia ? (
        <div className="mb-5 rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)] px-4 py-3.5">
          <div className="hdg text-[13px] font-semibold text-[var(--color-tenue)]">Dónde está</div>
          <div className="mt-0.5 text-[17px] font-semibold">
            <span className="text-[13px] font-normal text-[var(--color-tenue)]">{ICONO_CUSTODIA[custodia.tipo]} </span>
            {custodia.enlace
              ? <Link href={custodia.enlace} className="enlace">{custodia.nombre}</Link>
              : custodia.nombre}
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--color-tenue)]">
            Desde el {formatearFecha(ficha.custodiaDesde)} ({diasEnCustodia(ficha.custodiaDesde)} días)
            {' · '}
            <Etiqueta estilo={ETIQUETA_ESTADO[ficha.estado].estilo}>{ETIQUETA_ESTADO[ficha.estado].texto}</Etiqueta>
            {sinConfirmar ? (
              <span className="hdg ml-2 font-semibold text-[var(--color-acento)]">entrega sin confirmar</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {edita ? (
        <Panel titulo={esNueva ? undefined : 'Datos de la herramienta'}>
          <form action={guardarHerramienta} className="space-y-4 p-6">
            <input type="hidden" name="id" value={ficha?.id ?? ''} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Codigo" nombre="codigo" valor={ficha?.codigo} requerido mono ayuda="GDH y tres digitos. Si ponés 1, queda GDH001." />
              <Campo etiqueta="Nombre" nombre="nombre" valor={ficha?.nombre} requerido />
              <Campo etiqueta="Tipo" nombre="tipo" valor={ficha?.tipo} ayuda="Electrica, Manual, Eslinga, Medicion..." />
              <Seleccion
                etiqueta="Empresa"
                nombre="empresaId"
                valor={ficha?.empresaId}
                opciones={listaEmpresas.map((e) => ({ valor: e.id, texto: e.nombreCorto }))}
              />
              <Campo etiqueta="Marca" nombre="marca" valor={ficha?.marca} />
              <Campo etiqueta="Modelo" nombre="modelo" valor={ficha?.modelo} />
              <Campo etiqueta="Numero de serie" nombre="numeroSerie" valor={ficha?.numeroSerie} mono />
              <Seleccion
                etiqueta="Estado"
                nombre="estado"
                valor={ficha?.estado ?? 'activa'}
                vacio={null}
                opciones={[
                  { valor: 'activa', texto: 'Activa' },
                  { valor: 'en_reparacion', texto: 'En reparacion' },
                  { valor: 'perdida', texto: 'Perdida' },
                  { valor: 'baja', texto: 'De baja' },
                ]}
              />
            </div>

            {esNueva ? (
              <Seleccion
                etiqueta="Donde esta ahora"
                nombre="custodia"
                opciones={opcionesCustodia}
                vacio="Elegi un lugar, una unidad o una persona"
              />
            ) : null}

            <Campo etiqueta="Observaciones" nombre="observaciones" valor={ficha?.observaciones} />

            <div className="flex items-center gap-3 pt-2">
              <Boton type="submit">Guardar</Boton>
              <Link href="/herramientas" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
            </div>

            {!esNueva ? (
              <p className="text-[12px] text-[var(--color-tenue)]">
                La custodia no se edita acá: se mueve con una entrega, que deja historial.
              </p>
            ) : null}
          </form>
        </Panel>
      ) : null}

      {!esNueva ? (
        <div className="mt-5">
          <Panel titulo="Historial">
            {historial.length === 0 ? (
              <Vacio>No tuvo movimientos desde que se cargó.</Vacio>
            ) : (
              <Tabla cabeceras={['Cuándo', 'Qué pasó', 'De', 'A', 'Confirmación']}>
                {historial.map((m) => (
                  <Fila key={m.id}>
                    <Celda className="mono whitespace-nowrap text-[12.5px]">{formatearFechaHora(m.cuando)}</Celda>
                    <Celda>
                      {m.tipo === 'devolucion' ? 'Devolución' : 'Entrega'}
                      {m.salidaNumero ? (
                        <Link href={`/salidas/${m.salidaId}`} className="enlace ml-1 text-[11.5px]">
                          {m.salidaNumero}
                        </Link>
                      ) : null}
                      {m.observaciones ? (
                        <span className="block text-[11.5px] text-[var(--color-tenue)]">{m.observaciones}</span>
                      ) : null}
                    </Celda>
                    <Celda className="text-[var(--color-tenue)]">{lado(m.desdePersona, m.desdeUnidad, m.desdeLugar)}</Celda>
                    <Celda>{lado(m.haciaPersona, m.haciaUnidad, m.haciaLugar)}</Celda>
                    <Celda>
                      {m.confirmadoAt ? (
                        <span className="text-[12.5px] text-[var(--color-verde-texto)]">
                          {formatearFechaHora(m.confirmadoAt)}
                          {m.confirmadoNota ? (
                            <span className="block text-[11.5px] text-[var(--color-tenue)]">«{m.confirmadoNota}»</span>
                          ) : null}
                        </span>
                      ) : m.haciaPersona ? (
                        <span className="text-[12.5px] text-[var(--color-acento)]">sin confirmar</span>
                      ) : <SinDato />}
                    </Celda>
                  </Fila>
                ))}
              </Tabla>
            )}
          </Panel>
        </div>
      ) : null}
    </main>
  )
}

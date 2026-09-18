import Link from 'next/link'
import { and, asc, count, eq, inArray, isNull, ne } from 'drizzle-orm'
import { db } from '@/db'
import { empresas, equipos, personal, salidaPersonal, salidas, usoLivianos } from '@/db/schema'
import { BotonLink, Celda, Etiqueta, Fila, Panel, SinDato, Tabla, Tarjeta, Titulo, Vacio } from '@/components/ui'
import { empresasElegidas } from '@/lib/empresas-elegidas'
import { formatearHora, hoy, ZONA_HORARIA } from '@/lib/formato'
import { horasSinRegreso } from '@/lib/livianos'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO = {
  a_confirmar: { texto: 'A confirmar', estilo: 'neutra' },
  en_ejecucion: { texto: 'En ejecución', estilo: 'acento' },
  finalizado: { texto: 'Finalizado', estilo: 'verde' },
  anulado: { texto: 'Anulado', estilo: 'apagada' },
} as const

function fechaLarga(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(Date.UTC(anio, mes - 1, dia, 12)))
}

export default async function Tablero() {
  const sesion = await sesionRequerida()
  const fecha = hoy()
  const elegidas = await empresasElegidas()

  const filtroEmpresa = elegidas ? inArray(salidas.empresaId, elegidas) : undefined

  const [delDia, livianos, cuadrillas] = await Promise.all([
    db
      .select({
        id: salidas.id,
        numero: salidas.numero,
        horaSalida: salidas.horaSalida,
        estado: salidas.estado,
        ot: salidas.ot,
        remito: salidas.remito,
        lugarCarga: salidas.lugarCarga,
        lugarDescarga: salidas.lugarDescarga,
        interno: equipos.interno,
        marca: equipos.marca,
        modelo: equipos.modelo,
        empresa: empresas.nombreCorto,
      })
      .from(salidas)
      .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
      .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
      .where(and(eq(salidas.fecha, fecha), ne(salidas.estado, 'anulado'), filtroEmpresa))
      .orderBy(asc(salidas.horaSalida), asc(equipos.interno), asc(salidas.ordenDia)),

    db
      .select({
        id: usoLivianos.id,
        fecha: usoLivianos.fecha,
        horaSalida: usoLivianos.horaSalida,
        horaLlegada: usoLivianos.horaLlegada,
        interno: equipos.interno,
        persona: personal.apellidoNombre,
      })
      .from(usoLivianos)
      .innerJoin(equipos, eq(usoLivianos.equipoId, equipos.id))
      .leftJoin(personal, eq(usoLivianos.personalId, personal.id))
      .where(and(eq(usoLivianos.fecha, fecha), isNull(usoLivianos.horaLlegada)))
      .orderBy(asc(usoLivianos.horaSalida)),

    db
      .select({ salidaId: salidaPersonal.salidaId, nombre: personal.apellidoNombre })
      .from(salidaPersonal)
      .innerJoin(personal, eq(salidaPersonal.personalId, personal.id)),
  ])

  const [{ total: flota }] = await db.select({ total: count() }).from(equipos).where(eq(equipos.tipo, 'Liviano'))

  const enEjecucion = delDia.filter((s) => s.estado === 'en_ejecucion')
  const aConfirmar = delDia.filter((s) => s.estado === 'a_confirmar')
  const unidades = new Set(delDia.map((s) => s.interno)).size
  const primera = delDia.find((s) => s.horaSalida)?.horaSalida
  const sinRemito = aConfirmar.filter((s) => !s.remito).length
  const sinRegreso = livianos.filter((l) => horasSinRegreso(l) !== null && horasSinRegreso(l)! >= 12).length

  const personasDe = (salidaId: number) => cuadrillas.filter((c) => c.salidaId === salidaId).map((c) => c.nombre)

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-6 py-5">
      <Titulo
        bajada={<>{fechaLarga(fecha)}{elegidas ? ' · filtrado por empresa' : ''}</>}
        accion={
          <>
            <BotonLink href={`/api/pdf/dia/${fecha}${elegidas ? `?empresas=${elegidas.join(',')}` : ''}`} estilo="blanco" nuevaPestania>
              Imprimir parte del día
            </BotonLink>
            {puede(sesion.user.rol, 'editar_salidas') ? (
              <BotonLink href={`/salidas/nueva?fecha=${fecha}`}>+ Nueva salida</BotonLink>
            ) : null}
          </>
        }
      >
        Tablero del día
      </Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Tarjeta
          etiqueta="Salidas del día"
          valor={delDia.length}
          detalle={`${unidades} ${unidades === 1 ? 'unidad asignada' : 'unidades asignadas'}`}
        />
        <Tarjeta
          etiqueta="En ejecución"
          valor={enEjecucion.length}
          franja="acento"
          detalle={primera ? `primera salida ${formatearHora(primera)}` : 'sin horarios cargados'}
        />
        <Tarjeta
          etiqueta="A confirmar"
          valor={aConfirmar.length}
          franja="neutra"
          detalle={sinRemito > 0 ? `${sinRemito} sin remito cargado` : 'todas con remito'}
        />
        <Tarjeta
          etiqueta="Livianos fuera de base"
          valor={livianos.length}
          sobre={String(flota)}
          franja={sinRegreso > 0 ? 'acento' : 'verde'}
          detalle={sinRegreso > 0 ? `${sinRegreso} sin hora de regreso` : 'todos con regreso previsto'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel titulo="Salidas de trabajo de hoy">
          {delDia.length === 0 ? (
            <Vacio>No hay salidas cargadas para hoy.</Vacio>
          ) : (
            <Tabla cabeceras={['Hora', 'Unidad', 'Cliente / OT', 'Carga → Descarga', 'Personal', 'Estado']}>
              {delDia.map((s) => {
                const gente = personasDe(s.id)
                const etiqueta = ETIQUETA_ESTADO[s.estado]
                return (
                  <Fila key={s.id}>
                    <Celda className="mono font-medium">{formatearHora(s.horaSalida) || <SinDato />}</Celda>
                    <Celda>
                      <Link href={`/salidas/${s.id}`} className="mono font-semibold">{s.interno}</Link>
                      <div className="text-[11px] text-[var(--color-tenue)]">
                        {[s.marca, s.modelo].filter(Boolean).join(' ')}
                      </div>
                    </Celda>
                    <Celda>
                      <div className="font-semibold">{s.empresa}</div>
                      <div className="mono text-[11px] text-[var(--color-tenue)]">
                        {s.ot ? `OT ${s.ot}` : s.numero}
                      </div>
                    </Celda>
                    <Celda className="text-[var(--color-tenue)]">
                      {s.lugarCarga || s.lugarDescarga
                        ? `${s.lugarCarga ?? '—'} → ${s.lugarDescarga ?? '—'}`
                        : <SinDato />}
                    </Celda>
                    <Celda>
                      {gente.length === 0 ? <SinDato /> : (
                        <>
                          {gente[0]}
                          {gente.length > 1 ? (
                            <span className="text-[var(--color-tenue)]"> +{gente.length - 1}</span>
                          ) : null}
                        </>
                      )}
                    </Celda>
                    <Celda><Etiqueta estilo={etiqueta.estilo}>{etiqueta.texto}</Etiqueta></Celda>
                  </Fila>
                )
              })}
            </Tabla>
          )}
        </Panel>

        <Panel
          titulo="Vehículos livianos en uso"
          extra={<span className="mono text-[13px] text-[var(--color-tenue)]">{livianos.length}</span>}
        >
          {livianos.length === 0 ? (
            <Vacio>Ningún liviano fuera de base.</Vacio>
          ) : (
            <ul className="divide-y divide-[var(--color-borde)]">
              {livianos.map((l) => {
                const horas = horasSinRegreso(l)
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                    <span className="mono font-semibold">{l.interno}</span>
                    <span className="flex-grow truncate text-[var(--color-tenue)]">{l.persona ?? 'sin asignar'}</span>
                    {horas !== null && horas >= 12 ? (
                      <span className="mono text-[12px] font-semibold text-[var(--color-acento)]">sin regreso</span>
                    ) : (
                      <span className="mono text-[12px] text-[var(--color-tenue)]">{formatearHora(l.horaSalida)} →</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </main>
  )
}

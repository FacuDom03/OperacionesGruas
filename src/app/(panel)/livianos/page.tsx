import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipos, lugares, personal, usoLivianos } from '@/db/schema'
import { GrillaLivianos, type FilaLiviano } from './grilla'
import { BotonLink, Titulo } from '@/components/ui'
import { formatearFecha, hoy } from '@/lib/formato'
import { HORAS_SIN_REGRESO, horasSinRegreso } from '@/lib/livianos'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

/** Reemplaza el GD 208: quien uso cada liviano y en que horario. */
export default async function Livianos({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; error?: string; guardada?: string }>
}) {
  const sesion = await sesionRequerida()
  const { fecha: fechaBuscada, error, guardada } = await searchParams
  const fecha = fechaBuscada ?? hoy()

  const [unidades, usos, listaPersonal, listaLugares] = await Promise.all([
    db.select().from(equipos)
      .where(and(eq(equipos.tipo, 'Liviano'), eq(equipos.activo, true)))
      .orderBy(asc(equipos.interno)),
    db.select().from(usoLivianos).where(eq(usoLivianos.fecha, fecha)).orderBy(asc(usoLivianos.id)),
    db.select().from(personal).where(eq(personal.activo, true)).orderBy(asc(personal.apellidoNombre)),
    db.select().from(lugares).orderBy(asc(lugares.nombre)),
  ])

  // Una fila por unidad: la del movimiento del dia si lo tiene, o una vacia
  // lista para cargar. Si una unidad salio dos veces, van las dos filas.
  const filas: FilaLiviano[] = []

  for (const unidad of unidades) {
    const suyos = usos.filter((u) => u.equipoId === unidad.id)
    const descripcion = [unidad.marca, unidad.modelo, unidad.patente].filter(Boolean).join(' · ')

    if (suyos.length === 0) {
      filas.push({
        id: null,
        equipoId: unidad.id,
        interno: unidad.interno,
        descripcion,
        personalId: null,
        lugarSalida: null, horaSalida: null,
        lugarLlegada: null, horaLlegada: null,
        uso: null, observaciones: null,
        estado: 'en_base',
        horasSinRegreso: null,
      })
      continue
    }

    for (const uso of suyos) {
      filas.push({
        id: uso.id,
        equipoId: unidad.id,
        interno: unidad.interno,
        descripcion,
        personalId: uso.personalId,
        lugarSalida: uso.lugarSalida,
        horaSalida: uso.horaSalida,
        lugarLlegada: uso.lugarLlegada,
        horaLlegada: uso.horaLlegada,
        uso: uso.uso,
        observaciones: uso.observaciones,
        estado: uso.estado,
        horasSinRegreso: horasSinRegreso({
          fecha: uso.fecha,
          horaSalida: uso.horaSalida,
          horaLlegada: uso.horaLlegada,
        }),
      })
    }
  }

  const sinRegreso = filas.filter((f) => f.horasSinRegreso !== null && f.horasSinRegreso >= HORAS_SIN_REGRESO)
  const fueraDeBase = filas.filter((f) => f.horaSalida && !f.horaLlegada).length
  const enTaller = filas.filter((f) => f.estado === 'taller').length
  const editable = puede(sesion.user.rol, 'cargar_livianos')
  const mes = fecha.slice(0, 7)

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <Titulo
        bajada={formatearFecha(fecha)}
        accion={
          <>
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
            <BotonLink href={`/api/pdf/livianos/${fecha}`} estilo="blanco" nuevaPestania>PDF del día</BotonLink>
            <BotonLink href={`/api/pdf/livianos/mes/${mes}`} estilo="blanco" nuevaPestania>PDF del mes</BotonLink>
          </>
        }
      >
        Asignación y uso de vehículos livianos
      </Titulo>

      <div className="mb-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {[
          { n: filas.length, t: 'unidades en flota', acento: false },
          { n: fueraDeBase, t: 'fuera de base ahora', acento: fueraDeBase > 0 },
          { n: sinRegreso.length, t: 'sin hora de regreso', acento: sinRegreso.length > 0 },
          { n: enTaller, t: 'en taller externo', acento: false },
        ].map((k) => (
          <div key={k.t} className="flex items-baseline gap-2.5 rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)] px-4 py-3.5">
            <span className={`mono text-[26px] font-semibold leading-none ${k.acento ? 'text-[var(--color-acento)]' : ''}`}>{k.n}</span>
            <span className="hdg text-[13px] font-semibold text-[var(--color-tenue)]">{k.t}</span>
          </div>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-[5px] bg-[#fdecec] px-3 py-2 text-[13px] text-[#a32020]">{error}</p>
      ) : null}
      {guardada ? (
        <p className="mb-4 rounded-[5px] bg-[var(--color-verde-suave)] px-3 py-2 text-[13px] text-[var(--color-verde-texto)]">Movimiento guardado.</p>
      ) : null}

      {sinRegreso.length > 0 ? (
        <div className="mb-4 rounded-[5px] border border-[#f0d9a8] bg-[var(--color-acento-suave)] px-3 py-2.5 text-[13px] text-[var(--color-acento-oscuro)]">
          <span className="font-semibold">
            {sinRegreso.length === 1 ? 'Una unidad lleva' : `${sinRegreso.length} unidades llevan`} más de {HORAS_SIN_REGRESO} h sin hora de regreso:
          </span>{' '}
          <span className="mono">{sinRegreso.map((f) => f.interno).join(', ')}</span>
        </div>
      ) : null}

      <GrillaLivianos
        fecha={fecha}
        filas={filas}
        editable={editable}
        personal={listaPersonal.map((p) => ({ valor: p.id, texto: p.apellidoNombre }))}
        lugares={listaLugares.map((l) => l.nombre)}
      />
    </main>
  )
}

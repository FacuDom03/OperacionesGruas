import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipos, lugares, personal, usoLivianos } from '@/db/schema'
import { GrillaLivianos, type FilaLiviano } from './grilla'
import { Titulo } from '@/components/ui'
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
  const editable = puede(sesion.user.rol, 'cargar_livianos')
  const mes = fecha.slice(0, 7)

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <Titulo
        accion={
          <div className="flex items-center gap-2">
            <a
              href={`/api/pdf/livianos/${fecha}`}
              target="_blank"
              className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]"
            >
              PDF del dia
            </a>
            <a
              href={`/api/pdf/livianos/mes/${mes}`}
              target="_blank"
              className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]"
            >
              PDF del mes
            </a>
          </div>
        }
      >
        Vehiculos livianos del {formatearFecha(fecha)}
      </Titulo>

      <form className="mb-4 flex items-center gap-2">
        <label className="text-sm text-[var(--color-tenue)]">Ver otro dia</label>
        <input
          type="date"
          name="fecha"
          defaultValue={fecha}
          className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm"
        />
        <button type="submit" className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]">
          Ver
        </button>
      </form>

      {error ? <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {guardada ? <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Movimiento guardado.</p> : null}

      {sinRegreso.length > 0 ? (
        <div className="mb-4 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {sinRegreso.length === 1 ? 'Una unidad lleva' : `${sinRegreso.length} unidades llevan`} mas de {HORAS_SIN_REGRESO} h sin hora de regreso:
          </p>
          <p className="mt-1">{sinRegreso.map((f) => f.interno).join(', ')}</p>
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

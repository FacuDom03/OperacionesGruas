import Link from 'next/link'
import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipos, lugares, personal, salidaPersonal, salidas } from '@/db/schema'
import { entregarHerramientas } from '../acciones'
import { Boton, Panel, Titulo } from '@/components/ui'
import { FormularioEntrega, type OpcionHerramienta } from '@/components/formulario-entrega'
import { custodiaDe, escribirDestino, herramientasQueSePuedenMover } from '@/lib/herramientas'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function Entregar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; herramienta?: string; salida?: string }>
}) {
  await permisoRequerido('mover_herramientas')
  const { error, herramienta, salida } = await searchParams

  const [listaPersonal, listaEquipos, listaLugares, disponibles] = await Promise.all([
    db.select().from(personal).where(eq(personal.activo, true)).orderBy(asc(personal.apellidoNombre)),
    db.select().from(equipos).where(eq(equipos.activo, true)).orderBy(asc(equipos.interno)),
    db.select().from(lugares).orderBy(asc(lugares.nombre)),
    herramientasQueSePuedenMover(),
  ])

  const destinos = [
    ...listaPersonal.map((p) => ({
      valor: escribirDestino({ tipo: 'persona', id: p.id }),
      texto: p.telefonoWsp ? p.apellidoNombre : `${p.apellidoNombre} (sin teléfono)`,
      grupo: 'Personas',
    })),
    ...listaEquipos.map((e) => ({
      valor: escribirDestino({ tipo: 'unidad', id: e.id }),
      texto: `${e.interno}${e.marca ? ` — ${e.marca}` : ''}`,
      grupo: 'Unidades',
    })),
    ...listaLugares.map((l) => ({
      valor: escribirDestino({ tipo: 'lugar', id: l.id }),
      texto: l.nombre,
      grupo: 'Lugares (devolución)',
    })),
  ]

  const opciones: OpcionHerramienta[] = disponibles.map((h) => {
    const custodia = custodiaDe(h)
    return {
      id: h.id,
      codigo: h.codigo,
      nombre: h.nombre,
      donde: custodia.nombre,
      tipoCustodia: custodia.tipo,
    }
  })

  const elegidasAlAbrir = herramienta && Number(herramienta) ? [Number(herramienta)] : []

  // Si la entrega sale de una salida de trabajo, queda enganchada a ella y se
  // propone la cuadrilla: es quien se lleva las herramientas.
  const salidaId = Number(salida) || null
  const laSalida = salidaId
    ? (await db.select().from(salidas).where(eq(salidas.id, salidaId)).limit(1))[0] ?? null
    : null

  const cuadrilla = laSalida
    ? await db
      .select({ id: personal.id, nombre: personal.apellidoNombre, rol: salidaPersonal.rol })
      .from(salidaPersonal)
      .innerJoin(personal, eq(salidaPersonal.personalId, personal.id))
      .where(eq(salidaPersonal.salidaId, laSalida.id))
      .orderBy(asc(salidaPersonal.rol))
    : []

  // El que figure primero de la cuadrilla; si no hay nadie, la unidad.
  const propuesto = cuadrilla[0]
    ? escribirDestino({ tipo: 'persona', id: cuadrilla[0].id })
    : laSalida
      ? escribirDestino({ tipo: 'unidad', id: laSalida.equipoId })
      : ''

  return (
    <main className="mx-auto w-full max-w-[860px] flex-grow px-6 py-5">
      <Link href={salidaId ? `/salidas/${salidaId}` : '/herramientas'} className="enlace text-[12.5px]">
        {salidaId ? '‹ Volver a la salida' : '‹ Volver a herramientas'}
      </Link>

      <div className="mt-2">
        <Titulo
          bajada={laSalida
            ? `Para la salida ${laSalida.numero}. Queda enganchada a ese trabajo.`
            : 'Una entrega puede llevar varias herramientas a la misma persona'}
        >
          Entregar herramientas
        </Titulo>
      </div>

      {error ? (
        <p className="mb-4 rounded-[5px] bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</p>
      ) : null}

      <Panel>
        <form action={entregarHerramientas} className="space-y-5 p-6">
          {laSalida ? <input type="hidden" name="salidaId" value={laSalida.id} /> : null}

          <FormularioEntrega
            destinos={destinos}
            herramientas={opciones}
            elegidasAlAbrir={elegidasAlAbrir}
            destinoPropuesto={propuesto}
          />

          <div className="flex items-center gap-3 border-t border-[var(--color-borde)] pt-4">
            <Boton type="submit">Registrar entrega</Boton>
            <Link href="/herramientas" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
          </div>

          <p className="text-[12px] text-[var(--color-tenue)]">
            Si la recibe una persona, al guardar sale un link para que confirme
            desde el teléfono. El link se muestra una sola vez.
          </p>
        </form>
      </Panel>
    </main>
  )
}

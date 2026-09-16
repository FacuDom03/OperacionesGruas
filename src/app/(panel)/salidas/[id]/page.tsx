import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { salidaPersonal, salidas } from '@/db/schema'
import { reabrirSalida } from '../acciones'
import { FormularioSalida } from '../formulario'
import { opcionesDeSalida } from '../opciones'
import { Titulo } from '@/components/ui'
import { formatearFecha, hoy } from '@/lib/formato'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

function BotonPdf({ id }: { id: number }) {
  return (
    <a
      href={`/api/pdf/salida/${id}`}
      target="_blank"
      className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]"
    >
      PDF de la salida
    </a>
  )
}

export default async function EditarSalida({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await sesionRequerida()
  const { id } = await params

  const [salida] = await db.select().from(salidas).where(eq(salidas.id, Number(id))).limit(1)
  if (!salida) notFound()

  const [cuadrilla, opciones] = await Promise.all([
    db.select().from(salidaPersonal).where(eq(salidaPersonal.salidaId, salida.id)),
    opcionesDeSalida(),
  ])

  const finalizada = salida.estado === 'finalizado'
  const puedeEditar = puede(sesion.user.rol, 'editar_salidas')
  const puedeReabrir = puede(sesion.user.rol, 'reabrir_salida')

  // Una salida finalizada no se edita. Solo un admin la reabre, y queda en
  // auditoria (regla 4 del capitulo 4 del spec).
  if (finalizada || !puedeEditar) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-8">
        <Titulo accion={<BotonPdf id={salida.id} />}>{salida.numero}</Titulo>

        {finalizada ? (
          <div className="mb-6 rounded-md bg-green-50 px-4 py-3 text-sm text-green-900">
            <p className="font-medium">Esta salida esta finalizada, asi que no se edita.</p>
            {puedeReabrir ? (
              <form action={reabrirSalida} className="mt-3">
                <input type="hidden" name="id" value={salida.id} />
                <button type="submit" className="rounded-md bg-green-700 px-3 py-2 text-xs font-medium text-white hover:opacity-90">
                  Reabrir (queda registrado)
                </button>
              </form>
            ) : (
              <p className="mt-1">La puede reabrir un usuario admin.</p>
            )}
          </div>
        ) : null}

        <dl className="grid gap-4 rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)] p-6 text-sm sm:grid-cols-2">
          <div><dt className="text-[var(--color-tenue)]">Fecha</dt><dd>{formatearFecha(salida.fecha)}</dd></div>
          <div><dt className="text-[var(--color-tenue)]">Trabajo del dia</dt><dd>{salida.ordenDia}</dd></div>
          <div><dt className="text-[var(--color-tenue)]">OT</dt><dd>{salida.ot ?? '—'}</dd></div>
          <div><dt className="text-[var(--color-tenue)]">Remito</dt><dd>{salida.remito ?? '—'}</dd></div>
          <div><dt className="text-[var(--color-tenue)]">Carga</dt><dd>{salida.lugarCarga ?? '—'}</dd></div>
          <div><dt className="text-[var(--color-tenue)]">Descarga</dt><dd>{salida.lugarDescarga ?? '—'}</dd></div>
          <div className="sm:col-span-2"><dt className="text-[var(--color-tenue)]">Observaciones</dt><dd>{salida.observaciones ?? '—'}</dd></div>
        </dl>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Titulo accion={<BotonPdf id={salida.id} />}>{salida.numero}</Titulo>
      <FormularioSalida
        salida={{ ...salida, fecha: salida.fecha }}
        cuadrillaInicial={cuadrilla.map((c) => ({
          personalId: c.personalId,
          rol: c.rol,
          esSuplente: c.esSuplente,
        }))}
        hoy={hoy()}
        {...opciones}
      />
    </main>
  )
}

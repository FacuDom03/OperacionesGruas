import Link from 'next/link'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas, equipos, salidas } from '@/db/schema'
import { BotonLink, Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { formatearFecha, formatearHora, hoy } from '@/lib/formato'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const COLOR_ESTADO: Record<string, string> = {
  a_confirmar: 'text-[var(--color-a-confirmar)]',
  en_ejecucion: 'text-[var(--color-en-ejecucion)]',
  finalizado: 'text-[var(--color-finalizado)]',
  anulado: 'text-[var(--color-anulado)] line-through',
}

const NOMBRE_ESTADO: Record<string, string> = {
  a_confirmar: 'A confirmar',
  en_ejecucion: 'En ejecucion',
  finalizado: 'Finalizado',
  anulado: 'Anulado',
}

export default async function Salidas({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; guardada?: string }>
}) {
  const sesion = await sesionRequerida()
  const { fecha: fechaBuscada, guardada } = await searchParams
  const fecha = fechaBuscada ?? hoy()

  const filas = await db
    .select({
      id: salidas.id,
      numero: salidas.numero,
      ordenDia: salidas.ordenDia,
      horaSalida: salidas.horaSalida,
      estado: salidas.estado,
      ot: salidas.ot,
      lugarCarga: salidas.lugarCarga,
      lugarDescarga: salidas.lugarDescarga,
      interno: equipos.interno,
      empresa: empresas.nombreCorto,
    })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .where(and(eq(salidas.fecha, fecha)))
    .orderBy(asc(salidas.horaSalida), asc(equipos.interno), asc(salidas.ordenDia))

  const editable = puede(sesion.user.rol, 'editar_salidas')

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Titulo accion={editable ? <BotonLink href={`/salidas/nueva?fecha=${fecha}`}>Nueva salida</BotonLink> : undefined}>
        Salidas del {formatearFecha(fecha)}
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

      {guardada ? (
        <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">Salida guardada.</p>
      ) : null}

      <Panel>
        {filas.length === 0 ? (
          <Vacio>No hay salidas cargadas para ese dia.</Vacio>
        ) : (
          <Tabla cabeceras={['Numero', 'Hora', 'Unidad', 'Trabajo', 'Empresa', 'OT', 'Carga', 'Descarga', 'Estado']}>
            {filas.map((s) => (
              <Fila key={s.id}>
                <Celda className="tabular font-medium">
                  <Link href={`/salidas/${s.id}`} className="text-[var(--color-acento)] hover:underline">{s.numero}</Link>
                </Celda>
                <Celda className="tabular">{formatearHora(s.horaSalida) || <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className="tabular">{s.interno}</Celda>
                <Celda className="tabular">{s.ordenDia}</Celda>
                <Celda>{s.empresa}</Celda>
                <Celda className="tabular">{s.ot ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda>{s.lugarCarga ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda>{s.lugarDescarga ?? <span className="text-[var(--color-tenue)]">—</span>}</Celda>
                <Celda className={COLOR_ESTADO[s.estado]}>{NOMBRE_ESTADO[s.estado]}</Celda>
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-sm text-[var(--color-tenue)]">
        {filas.length} {filas.length === 1 ? 'salida' : 'salidas'} ese dia.
      </p>
    </main>
  )
}

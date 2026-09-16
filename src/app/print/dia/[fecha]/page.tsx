import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { empresas, equipos, salidas } from '@/db/schema'
import { HojaDeSalida } from '@/components/hoja-salida'
import { formatearFecha, formatearHora } from '@/lib/formato'
import { accesoDeImpresion } from '@/lib/permisos'
import { datosDeSalida } from '../../salida/[id]/page'

export const dynamic = 'force-dynamic'

const NOMBRE_ESTADO: Record<string, string> = {
  a_confirmar: 'A confirmar',
  en_ejecucion: 'En ejecucion',
  finalizado: 'Finalizado',
  anulado: 'Anulado',
}

/** Parte del dia: una portada con el resumen y despues una hoja por salida. */
export default async function ImprimirDia({
  params,
  searchParams,
}: {
  params: Promise<{ fecha: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { fecha } = await params
  const { token } = await searchParams

  await accesoDeImpresion(`/print/dia/${fecha}`, token)

  const resumen = await db
    .select({
      id: salidas.id,
      numero: salidas.numero,
      horaSalida: salidas.horaSalida,
      ordenDia: salidas.ordenDia,
      estado: salidas.estado,
      lugarDescarga: salidas.lugarDescarga,
      interno: equipos.interno,
      empresa: empresas.nombreCorto,
    })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .where(eq(salidas.fecha, fecha))
    .orderBy(asc(salidas.horaSalida), asc(equipos.interno), asc(salidas.ordenDia))

  const hojas = await Promise.all(resumen.map((s) => datosDeSalida(s.id)))

  return (
    <>
      <main className="mx-auto w-full max-w-[190mm] break-after-page">
        <header className="border-b-2 border-black pb-2">
          <h1 className="text-[16pt] font-bold leading-tight">Parte del dia</h1>
          <p className="text-[11pt]">{formatearFecha(fecha)}</p>
        </header>

        <table className="mt-4 w-full border-collapse text-[10pt]">
          <thead>
            <tr className="border-y border-black/30 text-left text-[8pt] uppercase text-black/60">
              <th className="py-1 font-medium">Numero</th>
              <th className="py-1 font-medium">Hora</th>
              <th className="py-1 font-medium">Unidad</th>
              <th className="py-1 font-medium">Trabajo</th>
              <th className="py-1 font-medium">Empresa</th>
              <th className="py-1 font-medium">Descarga</th>
              <th className="py-1 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {resumen.length === 0 ? (
              <tr><td colSpan={7} className="py-3 text-black/50">No hay salidas cargadas para este dia.</td></tr>
            ) : (
              resumen.map((s) => (
                <tr key={s.id} className="border-b border-black/10">
                  <td className="py-1">{s.numero}</td>
                  <td className="py-1">{formatearHora(s.horaSalida)}</td>
                  <td className="py-1">{s.interno}</td>
                  <td className="py-1">{s.ordenDia}</td>
                  <td className="py-1">{s.empresa}</td>
                  <td className="py-1">{s.lugarDescarga ?? ''}</td>
                  <td className="py-1">{NOMBRE_ESTADO[s.estado]}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="mt-4 text-[9pt] text-black/60">
          {resumen.length} {resumen.length === 1 ? 'salida' : 'salidas'}.
        </p>
      </main>

      {hojas.map((hoja) => (hoja ? <HojaDeSalida key={hoja.salida.numero} {...hoja} /> : null))}
    </>
  )
}

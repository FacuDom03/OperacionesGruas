import { GrillaLivianosImpresa } from '@/components/grilla-livianos-impresa'
import { movimientosDelMes } from '@/lib/consultas-livianos'
import { accesoDeImpresion } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** Una pagina por dia con movimiento, y al final los totales por unidad. */
export default async function ImprimirLivianosMes({
  params,
  searchParams,
}: {
  params: Promise<{ mes: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { mes } = await params
  const { token } = await searchParams

  await accesoDeImpresion(`/print/livianos/mes/${mes}`, token)

  const movimientos = await movimientosDelMes(mes)

  const porDia = new Map<string, typeof movimientos>()
  for (const m of movimientos) {
    const delDia = porDia.get(m.fecha) ?? []
    delDia.push(m)
    porDia.set(m.fecha, delDia)
  }

  // Totales por unidad: cuantas salidas y cuantas quedaron sin hora de regreso.
  const totales = new Map<string, { salidas: number; sinRegreso: number }>()
  for (const m of movimientos) {
    const actual = totales.get(m.interno) ?? { salidas: 0, sinRegreso: 0 }
    actual.salidas += 1
    if (m.horaSalida && !m.horaLlegada) actual.sinRegreso += 1
    totales.set(m.interno, actual)
  }

  const [anio, numeroMes] = mes.split('-').map(Number)
  const nombreMes = `${MESES[numeroMes - 1]} de ${anio}`

  return (
    <>
      {[...porDia.entries()].map(([fecha, delDia]) => (
        <GrillaLivianosImpresa
          key={fecha}
          fecha={fecha}
          movimientos={delDia}
          titulo={`Vehículos livianos — ${nombreMes}`}
        />
      ))}

      <main className="w-full">
        <header className="border-b-2 border-black pb-2">
          <h1 className="hdg text-[15pt] font-bold leading-tight">Totales por unidad</h1>
          <p className="text-[10pt]">{nombreMes}</p>
        </header>

        <table className="mt-3 w-full border-collapse text-[10pt]">
          <thead>
            <tr className="hdg border-y border-black/30 text-left text-[7.5pt] text-black/60">
              <th className="py-1 font-medium">Unidad</th>
              <th className="py-1 font-medium">Movimientos</th>
              <th className="py-1 font-medium">Sin hora de regreso</th>
            </tr>
          </thead>
          <tbody>
            {totales.size === 0 ? (
              <tr><td colSpan={3} className="py-3 text-black/50">Sin movimientos en el mes.</td></tr>
            ) : (
              [...totales.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([interno, t]) => (
                <tr key={interno} className="border-b border-black/10">
                  <td className="mono py-1">{interno}</td>
                  <td className="mono py-1">{t.salidas}</td>
                  <td className="mono py-1">{t.sinRegreso || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <p className="mt-3 text-[8pt] text-black/60">
          {movimientos.length} movimientos en {porDia.size} {porDia.size === 1 ? 'dia' : 'dias'}.
        </p>
      </main>
    </>
  )
}

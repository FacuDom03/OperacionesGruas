import { formatearFecha, formatearHora } from '@/lib/formato'
import type { MovimientoLiviano } from '@/lib/consultas-livianos'

/* La grilla de livianos como sale en papel. La usan el PDF del dia y el del
   mes, que es una de estas por cada dia con movimiento. */

const NOMBRE_ESTADO: Record<string, string> = {
  en_base: 'En base',
  en_uso: 'En uso',
  taller: 'Taller',
  no_disponible: 'No disponible',
}

export function GrillaLivianosImpresa({
  fecha,
  movimientos,
  titulo,
}: {
  fecha: string
  movimientos: MovimientoLiviano[]
  titulo?: string
}) {
  return (
    <main className="w-full">
      <header className="border-b-2 border-black pb-2">
        <h1 className="hdg text-[15pt] font-bold leading-tight">{titulo ?? 'Vehículos livianos'}</h1>
        <p className="mono text-[10pt]">{formatearFecha(fecha)}</p>
      </header>

      <table className="mt-3 w-full border-collapse text-[9pt]">
        <thead>
          <tr className="hdg border-y border-black/30 text-left text-[7.5pt] text-black/60">
            <th className="py-1 font-medium">Unidad</th>
            <th className="py-1 font-medium">Patente</th>
            <th className="py-1 font-medium">Personal</th>
            <th className="py-1 font-medium">Lugar salida</th>
            <th className="py-1 font-medium">Hora</th>
            <th className="py-1 font-medium">Lugar llegada</th>
            <th className="py-1 font-medium">Hora</th>
            <th className="py-1 font-medium">Uso</th>
            <th className="py-1 font-medium">Estado</th>
            <th className="py-1 font-medium">Observaciones</th>
          </tr>
        </thead>
        <tbody>
          {movimientos.length === 0 ? (
            <tr><td colSpan={10} className="py-3 text-black/50">Sin movimientos cargados.</td></tr>
          ) : (
            movimientos.map((m) => (
              <tr key={m.id} className="border-b border-black/10">
                <td className="mono py-1">{m.interno}</td>
                <td className="mono py-1">{m.patente ?? ''}</td>
                <td className="py-1">{m.persona ?? ''}</td>
                <td className="py-1">{m.lugarSalida ?? ''}</td>
                <td className="mono py-1">{formatearHora(m.horaSalida)}</td>
                <td className="py-1">{m.lugarLlegada ?? ''}</td>
                <td className="mono py-1">
                  {m.horaLlegada ? formatearHora(m.horaLlegada) : <span className="text-black/50">sin regreso</span>}
                </td>
                <td className="py-1">{m.uso ?? ''}</td>
                <td className="py-1">{NOMBRE_ESTADO[m.estado] ?? m.estado}</td>
                <td className="py-1">{m.observaciones ?? ''}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <p className="mt-3 text-[8pt] text-black/60">
        {movimientos.length} {movimientos.length === 1 ? 'movimiento' : 'movimientos'}.
      </p>
    </main>
  )
}

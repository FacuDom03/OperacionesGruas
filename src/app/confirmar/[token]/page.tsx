import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { equipos, personal } from '@/db/schema'
import { confirmar } from './acciones'
import { herramientasDeEntrega } from '@/lib/herramientas'
import { entregaPorToken } from '@/lib/mover-herramientas'
import { formatearFechaHora } from '@/lib/formato'

export const dynamic = 'force-dynamic'

/**
 * El formulario que abre el empleado desde el WhatsApp. Sin sesión: la
 * credencial es el token del link. Está pensado para un teléfono, así que es
 * una sola columna y con los textos grandes.
 */
export default async function Confirmar({
  params, searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ listo?: string; error?: string }>
}) {
  const { token } = await params
  const { listo, error } = await searchParams

  const entrega = await entregaPorToken(token)

  return (
    <div className="px-5 py-8">
      <main className="mx-auto w-full max-w-[480px]">
        <p className="hdg text-[13px] font-semibold text-[var(--color-tenue)]">Grupo Daniele</p>
        <h1 className="hdg mt-1 text-[26px] font-bold leading-tight">Recepción de herramientas</h1>

        {!entrega ? (
          <Aviso tono="error">
            Este link no sirve. Puede que ya lo hayas usado o que esté mal copiado.
            Avisale a quien te lo mandó.
          </Aviso>
        ) : entrega.vencida ? (
          <Aviso tono="error">
            Este link venció. Pedile a la oficina que te mande uno nuevo.
          </Aviso>
        ) : entrega.confirmadoAt || listo ? (
          <Aviso tono="ok">
            <strong>Listo, quedó confirmado.</strong>
            <span className="mt-1 block">
              {formatearFechaHora(entrega.confirmadoAt ?? new Date())}. Ya podés cerrar esta página.
            </span>
          </Aviso>
        ) : (
          <Formulario token={token} entrega={entrega} error={error} />
        )}
      </main>
    </div>
  )
}

function Aviso({ tono, children }: { tono: 'ok' | 'error'; children: React.ReactNode }) {
  const estilos = tono === 'ok'
    ? 'border-[var(--color-verde)] bg-[var(--color-verde-suave)] text-[var(--color-verde-texto)]'
    : 'border-[var(--color-borde-fuerte)] bg-white text-[var(--color-texto)]'
  return (
    <div className={`mt-5 rounded-[6px] border px-4 py-4 text-[15px] ${estilos}`}>{children}</div>
  )
}

async function Formulario({
  token, entrega, error,
}: {
  token: string
  entrega: { id: number; haciaPersonalId: number | null; haciaEquipoId: number | null; observaciones: string | null; createdAt: Date }
  error?: string
}) {
  const [herramientas, quien] = await Promise.all([
    herramientasDeEntrega(entrega.id),
    entrega.haciaPersonalId
      ? db.select({ nombre: personal.apellidoNombre }).from(personal).where(eq(personal.id, entrega.haciaPersonalId)).limit(1)
      : entrega.haciaEquipoId
        ? db.select({ nombre: equipos.interno }).from(equipos).where(eq(equipos.id, entrega.haciaEquipoId)).limit(1)
        : Promise.resolve([]),
  ])

  return (
    <>
      <p className="mt-2 text-[15px] text-[var(--color-tenue)]">
        {quien[0]?.nombre ? <>Hola, <strong className="text-[var(--color-texto)]">{quien[0].nombre}</strong>. </> : null}
        Te entregaron {herramientas.length === 1 ? 'esta herramienta' : `estas ${herramientas.length} herramientas`} el{' '}
        {formatearFechaHora(entrega.createdAt)}.
      </p>

      <ul className="mt-4 overflow-hidden rounded-[6px] border border-[var(--color-borde)] bg-white">
        {herramientas.map((h) => (
          <li key={h.codigo} className="border-b border-[var(--color-borde)] px-4 py-3 last:border-0">
            <div className="flex items-baseline gap-2">
              <span className="mono text-[13px] text-[var(--color-tenue)]">{h.codigo}</span>
              <span className="text-[15px] font-medium">{h.nombre}</span>
            </div>
            {h.marca || h.modelo || h.numeroSerie ? (
              <div className="mt-0.5 text-[13px] text-[var(--color-tenue)]">
                {[h.marca, h.modelo, h.numeroSerie ? `serie ${h.numeroSerie}` : null].filter(Boolean).join(' · ')}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {entrega.observaciones ? (
        <p className="mt-3 text-[14px] text-[var(--color-tenue)]">
          Nota de la oficina: {entrega.observaciones}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-[6px] bg-red-50 px-4 py-3 text-[14px] text-red-700">{error}</p>
      ) : null}

      <form action={confirmar} className="mt-5">
        <input type="hidden" name="token" value={token} />

        <label className="block">
          <span className="hdg block text-[13px] font-semibold text-[var(--color-tenue)]">
            ¿Querés aclarar algo? (opcional)
          </span>
          <textarea
            name="nota"
            rows={3}
            placeholder="Por ejemplo: falta el cargador."
            className="mt-1 w-full rounded-[6px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[var(--color-acento)]"
          />
        </label>

        <button
          type="submit"
          className="hdg mt-4 w-full rounded-[6px] bg-[var(--color-acento)] px-4 py-3.5 text-[16px] font-semibold text-white hover:bg-[var(--color-acento-oscuro)]"
        >
          Confirmo que las recibí
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-[var(--color-tenue)]">
        Al confirmar, quedan a tu cargo hasta que las devuelvas.
      </p>
    </>
  )
}

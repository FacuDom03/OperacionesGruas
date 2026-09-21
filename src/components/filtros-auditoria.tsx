'use client'

import { useRouter } from 'next/navigation'

const ENTRADA =
  'rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-acento)]'

/**
 * Los filtros del registro. Cada cambio navega solo, sin botón: la fecha ya
 * funciona así en el resto de las pantallas y conviene que sea parejo.
 */
export function FiltrosAuditoria({
  entidad,
  accion,
  usuarioId,
  desde,
  hasta,
  entidades,
  usuarios,
  acciones,
}: {
  entidad: string
  accion: string
  usuarioId: string
  desde: string
  hasta: string
  entidades: { valor: string; texto: string }[]
  usuarios: { valor: string; texto: string }[]
  acciones: { valor: string; texto: string }[]
}) {
  const router = useRouter()
  const actual = { entidad, accion, usuario: usuarioId, desde, hasta }

  function ir(campo: keyof typeof actual, valor: string) {
    const params = new URLSearchParams()
    for (const [clave, v] of Object.entries({ ...actual, [campo]: valor })) {
      if (v) params.set(clave, v)
    }
    // Al cambiar un filtro se vuelve a la primera página: la vieja puede no existir.
    router.push(params.size ? `/auditoria?${params}` : '/auditoria')
  }

  const hayFiltro = Boolean(entidad || accion || usuarioId || desde || hasta)

  return (
    <div className="mb-4 flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">Qué</span>
        <select value={entidad} onChange={(e) => ir('entidad', e.target.value)} className={`mt-1 ${ENTRADA}`}>
          <option value="">Todo</option>
          {entidades.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">Acción</span>
        <select value={accion} onChange={(e) => ir('accion', e.target.value)} className={`mt-1 ${ENTRADA}`}>
          <option value="">Todas</option>
          {acciones.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">Usuario</span>
        <select value={usuarioId} onChange={(e) => ir('usuario', e.target.value)} className={`mt-1 ${ENTRADA}`}>
          <option value="">Todos</option>
          {usuarios.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      </label>

      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">Desde</span>
        <input
          type="date"
          value={desde}
          onChange={(e) => ir('desde', e.target.value)}
          className={`mono mt-1 ${ENTRADA}`}
        />
      </label>

      <label className="block">
        <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">Hasta</span>
        <input
          type="date"
          value={hasta}
          onChange={(e) => ir('hasta', e.target.value)}
          className={`mono mt-1 ${ENTRADA}`}
        />
      </label>

      {hayFiltro ? (
        <button
          type="button"
          onClick={() => router.push('/auditoria')}
          className="hdg px-1 py-2.5 text-[12px] font-semibold text-[var(--color-acento)]"
        >
          Limpiar filtros
        </button>
      ) : null}
    </div>
  )
}

'use client'

import { useState } from 'react'
import { borrarUsoLiviano, guardarUsoLiviano } from './acciones'

export type FilaLiviano = {
  id: number | null
  equipoId: number
  interno: string
  descripcion: string
  personalId: number | null
  lugarSalida: string | null
  horaSalida: string | null
  lugarLlegada: string | null
  horaLlegada: string | null
  uso: string | null
  observaciones: string | null
  estado: string
  horasSinRegreso: number | null
}

const ESTADOS = [
  { valor: 'en_base', texto: 'En base' },
  { valor: 'en_uso', texto: 'En uso' },
  { valor: 'taller', texto: 'Taller' },
  { valor: 'no_disponible', texto: 'No disponible' },
]

/* Los campos se ven como texto de tabla y recien muestran el borde al pasar por
   encima o al enfocarlos: asi la grilla se lee como la del mockup pero se sigue
   editando en linea. */
const campo =
  'w-full rounded-[3px] border border-transparent bg-transparent px-1.5 py-1 text-[13px] outline-none ' +
  'hover:border-[var(--color-borde)] hover:bg-white focus:border-[var(--color-acento)] focus:bg-white ' +
  'disabled:hover:border-transparent disabled:hover:bg-transparent'

/* Una grilla, no una tabla: cada fila es su propio formulario y un <form> no
   puede vivir dentro de un <tr>. Ademas asi cada fila se guarda sola. */
const COLUMNAS =
  'grid grid-cols-[132px_180px_140px_84px_140px_84px_128px_120px_1fr_120px] gap-1.5 items-center'

export function GrillaLivianos({
  fecha,
  filas,
  personal,
  lugares,
  editable,
}: {
  fecha: string
  filas: FilaLiviano[]
  personal: { valor: number; texto: string }[]
  lugares: string[]
  editable: boolean
}) {
  // Las filas de unidades que todavia no salieron arrancan plegadas, para que la
  // grilla muestre primero lo que esta pasando hoy.
  const [verTodas, setVerTodas] = useState(false)
  const conMovimiento = filas.filter((f) => f.id !== null)
  const visibles = verTodas ? filas : conMovimiento

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-[13px]">
        <button
          type="button"
          onClick={() => setVerTodas(!verTodas)}
          className="rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 font-semibold hover:bg-[var(--color-panel-suave)]"
        >
          {verTodas ? 'Ver solo las que se movieron' : `Ver las ${filas.length} unidades`}
        </button>
        <span className="text-[var(--color-tenue)]">
          {conMovimiento.length} con movimiento cargado
        </span>
      </div>

      <div className="overflow-x-auto rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)]">
        <div className="min-w-[1320px]">
          <div className={`${COLUMNAS} hdg border-b border-[var(--color-borde)] bg-[var(--color-panel-suave)] px-3 py-2.5 text-[12px] font-semibold text-[var(--color-tenue)]`}>
            <div>Interno</div>
            <div>Personal asignado</div>
            <div>Salida — lugar</div>
            <div>Hora</div>
            <div>Llegada — lugar</div>
            <div>Hora</div>
            <div>Uso</div>
            <div>Estado</div>
            <div>Observaciones</div>
            <div></div>
          </div>

          {visibles.length === 0 ? (
            <p className="px-3 py-10 text-center text-[13px] text-[var(--color-tenue)]">
              Todavía no se cargó ningún movimiento ese día.
            </p>
          ) : (
            visibles.map((f) => (
              <form
                key={f.id ?? `vacia-${f.equipoId}`}
                action={guardarUsoLiviano}
                className={`${COLUMNAS} border-b border-[var(--color-borde)] px-3 py-2 last:border-0 ${
                  f.horasSinRegreso !== null && f.horasSinRegreso >= 12 ? 'bg-[#fdfaf5]' : ''
                }`}
              >
                <input type="hidden" name="fecha" value={fecha} />
                <input type="hidden" name="equipoId" value={f.equipoId} />
                <input type="hidden" name="id" value={f.id ?? ''} />

                <div>
                  <div className="mono text-[13px] font-semibold">{f.interno}</div>
                  <div className="truncate text-[11px] text-[var(--color-tenue)]">{f.descripcion}</div>
                  {f.horasSinRegreso !== null && f.horasSinRegreso >= 12 ? (
                    <div className="mono mt-0.5 text-[11px] font-semibold text-[var(--color-acento)]">
                      {Math.floor(f.horasSinRegreso)} h sin regreso
                    </div>
                  ) : null}
                </div>

                <select name="personalId" defaultValue={f.personalId ?? ''} disabled={!editable} className={campo}>
                  <option value="">Sin asignar</option>
                  {personal.map((p) => <option key={p.valor} value={p.valor}>{p.texto}</option>)}
                </select>

                <input name="lugarSalida" list="lugares" defaultValue={f.lugarSalida ?? ''} disabled={!editable} className={campo} />
                <input name="horaSalida" type="time" defaultValue={f.horaSalida?.slice(0, 5) ?? ''} disabled={!editable} className={`${campo} mono`} />
                <input name="lugarLlegada" list="lugares" defaultValue={f.lugarLlegada ?? ''} disabled={!editable} className={campo} />
                <input name="horaLlegada" type="time" defaultValue={f.horaLlegada?.slice(0, 5) ?? ''} disabled={!editable} className={`${campo} mono`} />
                <input name="uso" defaultValue={f.uso ?? ''} disabled={!editable} placeholder="obra, tramites..." className={campo} />

                <select name="estado" defaultValue={f.estado} disabled={!editable} className={campo}>
                  {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
                </select>

                <input name="observaciones" defaultValue={f.observaciones ?? ''} disabled={!editable} className={campo} />

                {editable ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="rounded-[3px] bg-[var(--color-acento)] px-2.5 py-1 text-[11.5px] font-semibold text-white hover:bg-[var(--color-acento-oscuro)]"
                    >
                      Guardar
                    </button>
                    {f.id ? (
                      <button
                        type="submit"
                        formAction={borrarUsoLiviano}
                        className="text-[11.5px] text-[var(--color-tenue-2)] hover:text-[#a32020]"
                      >
                        Borrar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </form>
            ))
          )}
        </div>
      </div>

      <datalist id="lugares">
        {lugares.map((l) => <option key={l} value={l} />)}
      </datalist>
    </div>
  )
}

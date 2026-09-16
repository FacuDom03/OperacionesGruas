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

const campo =
  'w-full rounded border border-[var(--color-borde)] bg-white px-2 py-1 text-sm outline-none focus:border-[var(--color-acento)]'

/* Una grilla, no una tabla: cada fila es su propio formulario y un <form> no
   puede vivir dentro de un <tr>. Ademas asi cada fila se guarda sola. */
const COLUMNAS =
  'grid grid-cols-[150px_190px_150px_90px_150px_90px_150px_140px_1fr_150px] gap-2 items-center'

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
      <div className="mb-3 flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={() => setVerTodas(!verTodas)}
          className="rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 hover:bg-[var(--color-fondo)]"
        >
          {verTodas ? 'Ver solo las que se movieron' : `Ver las ${filas.length} unidades`}
        </button>
        <span className="text-[var(--color-tenue)]">
          {conMovimiento.length} con movimiento cargado
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)]">
        <div className="min-w-[1400px]">
          <div className={`${COLUMNAS} border-b border-[var(--color-borde)] px-3 py-2 text-xs uppercase tracking-wide text-[var(--color-tenue)]`}>
            <div>Unidad</div>
            <div>Persona</div>
            <div>Lugar salida</div>
            <div>Hora</div>
            <div>Lugar llegada</div>
            <div>Hora</div>
            <div>Uso</div>
            <div>Estado</div>
            <div>Observaciones</div>
            <div></div>
          </div>

          {visibles.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-[var(--color-tenue)]">
              Todavia no se cargo ningun movimiento ese dia.
            </p>
          ) : (
            visibles.map((f) => (
              <form
                key={f.id ?? `vacia-${f.equipoId}`}
                action={guardarUsoLiviano}
                className={`${COLUMNAS} border-b border-[var(--color-borde)] px-3 py-2 last:border-0`}
              >
                <input type="hidden" name="fecha" value={fecha} />
                <input type="hidden" name="equipoId" value={f.equipoId} />
                <input type="hidden" name="id" value={f.id ?? ''} />

                <div>
                  <div className="tabular text-sm font-medium">{f.interno}</div>
                  <div className="truncate text-xs text-[var(--color-tenue)]">{f.descripcion}</div>
                  {f.horasSinRegreso !== null ? (
                    <div className="mt-1 text-xs font-medium text-amber-700">
                      sin regreso hace {Math.floor(f.horasSinRegreso)} h
                    </div>
                  ) : null}
                </div>

                <select name="personalId" defaultValue={f.personalId ?? ''} disabled={!editable} className={campo}>
                  <option value="">Sin asignar</option>
                  {personal.map((p) => <option key={p.valor} value={p.valor}>{p.texto}</option>)}
                </select>

                <input name="lugarSalida" list="lugares" defaultValue={f.lugarSalida ?? ''} disabled={!editable} className={campo} />
                <input name="horaSalida" type="time" defaultValue={f.horaSalida?.slice(0, 5) ?? ''} disabled={!editable} className={campo} />
                <input name="lugarLlegada" list="lugares" defaultValue={f.lugarLlegada ?? ''} disabled={!editable} className={campo} />
                <input name="horaLlegada" type="time" defaultValue={f.horaLlegada?.slice(0, 5) ?? ''} disabled={!editable} className={campo} />
                <input name="uso" defaultValue={f.uso ?? ''} disabled={!editable} placeholder="obra, tramites..." className={campo} />

                <select name="estado" defaultValue={f.estado} disabled={!editable} className={campo}>
                  {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
                </select>

                <input name="observaciones" defaultValue={f.observaciones ?? ''} disabled={!editable} className={campo} />

                {editable ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="rounded bg-[var(--color-acento)] px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Guardar
                    </button>
                    {f.id ? (
                      <button
                        type="submit"
                        formAction={borrarUsoLiviano}
                        className="text-xs text-[var(--color-tenue)] hover:text-red-700"
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

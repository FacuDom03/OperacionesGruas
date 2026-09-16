'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { guardarSalida, type EstadoFormulario } from './acciones'

export type Opcion = { valor: number; texto: string }

export type SalidaEnFormulario = {
  id: number
  numero: string
  fecha: string
  ordenDia: number
  equipoId: number
  equipoAuxId: number | null
  empresaId: number
  clienteId: number | null
  ot: string | null
  remito: string | null
  horaSalida: string | null
  lugarCarga: string | null
  contactoCarga: string | null
  telefonoCarga: string | null
  lugarDescarga: string | null
  contactoDescarga: string | null
  telefonoDescarga: string | null
  verificadorId: number | null
  operadorId: number | null
  gestion: string | null
  estado: string
  observaciones: string | null
}

export type FilaCuadrilla = { personalId: number; rol: string; esSuplente: boolean }

const ROLES = [
  { valor: 'chofer', texto: 'Chofer' },
  { valor: 'operador_grua', texto: 'Operador de grua' },
  { valor: 'jefe_cuadrilla', texto: 'Jefe de cuadrilla' },
  { valor: 'ayudante', texto: 'Ayudante' },
  { valor: 'acompanante', texto: 'Acompañante' },
]

const ESTADOS = [
  { valor: 'a_confirmar', texto: 'A confirmar' },
  { valor: 'en_ejecucion', texto: 'En ejecucion' },
  { valor: 'finalizado', texto: 'Finalizado' },
  { valor: 'anulado', texto: 'Anulado' },
]

const GESTIONES = [
  { valor: 'permiso_corte', texto: 'Permiso de corte' },
  { valor: 'traslado_carreton', texto: 'Traslado en carreton' },
  { valor: 'otros', texto: 'Otros' },
]

const entrada =
  'mt-1 w-full rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]'

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{etiqueta}</span>
      {children}
    </label>
  )
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-[var(--color-borde)] p-6 last:border-0">
      <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-[var(--color-tenue)]">
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export function FormularioSalida({
  salida,
  cuadrillaInicial,
  hoy,
  equipos,
  empresas,
  clientes,
  personal,
  verificadores,
  operadores,
}: {
  salida: SalidaEnFormulario | null
  cuadrillaInicial: FilaCuadrilla[]
  hoy: string
  equipos: Opcion[]
  empresas: Opcion[]
  clientes: Opcion[]
  personal: Opcion[]
  verificadores: Opcion[]
  operadores: Opcion[]
}) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(guardarSalida, {})

  /**
   * React limpia el formulario cuando la accion termina. Para que ver un aviso
   * no signifique volver a cargar todo, los valores por defecto salen de lo que
   * la accion devolvio, y recien si no hay nada, de la salida que se esta
   * editando.
   */
  const previo = (nombre: string) => estado.enviado?.[nombre]

  const filasIniciales =
    cuadrillaInicial.length > 0 ? cuadrillaInicial : [{ personalId: 0, rol: 'chofer', esSuplente: false }]

  const [cuadrilla, setCuadrilla] = useState<FilaCuadrilla[]>(filasIniciales)

  // Misma idea para la cuadrilla: cuando vuelve la accion, se reponen las filas
  // que el usuario habia cargado.
  //
  // `vuelta` cambia con cada respuesta y es la clave del formulario, asi que se
  // vuelve a montar entero. Hace falta por los <select>: React les aplica el
  // defaultValue solo al montarlos, y sin esto quedaban vacios despues de cada
  // aviso aunque el resto de los campos si se repusiera.
  const [estadoVisto, setEstadoVisto] = useState(estado)
  const [vuelta, setVuelta] = useState(0)
  if (estado !== estadoVisto) {
    setEstadoVisto(estado)
    setVuelta(vuelta + 1)
    setCuadrilla(estado.cuadrilla && estado.cuadrilla.length > 0 ? estado.cuadrilla : filasIniciales)
  }

  return (
    <form key={vuelta} action={enviar} className="rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)]">
      <input type="hidden" name="id" value={salida?.id ?? ''} />

      <Bloque titulo="Unidad y trabajo">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Fecha">
            <input type="date" name="fecha" required defaultValue={previo('fecha') ?? salida?.fecha ?? hoy} className={entrada} />
          </Campo>

          <Campo etiqueta="Trabajo del dia">
            <select name="ordenDia" defaultValue={previo('ordenDia') ?? salida?.ordenDia ?? 1} className={entrada}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>Trabajo {n}</option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Hora de salida">
            <input type="time" name="horaSalida" defaultValue={previo('horaSalida') ?? salida?.horaSalida?.slice(0, 5) ?? ''} className={entrada} />
          </Campo>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Unidad">
            <select name="equipoId" required defaultValue={previo('equipoId') ?? salida?.equipoId ?? ''} className={entrada}>
              <option value="">Elegi una unidad</option>
              {equipos.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
            </select>
          </Campo>

          <Campo etiqueta="Equipo auxiliar">
            <select name="equipoAuxId" defaultValue={previo('equipoAuxId') ?? salida?.equipoAuxId ?? ''} className={entrada}>
              <option value="">Sin auxiliar</option>
              {equipos.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
            </select>
          </Campo>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Empresa del grupo">
            <select name="empresaId" required defaultValue={previo('empresaId') ?? salida?.empresaId ?? ''} className={entrada}>
              <option value="">Elegi una empresa</option>
              {empresas.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
            </select>
          </Campo>

          <Campo etiqueta="Cliente">
            <select name="clienteId" defaultValue={previo('clienteId') ?? salida?.clienteId ?? ''} className={entrada}>
              <option value="">Sin cliente</option>
              {clientes.map((c) => <option key={c.valor} value={c.valor}>{c.texto}</option>)}
            </select>
          </Campo>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="OT"><input name="ot" defaultValue={previo('ot') ?? salida?.ot ?? ''} className={entrada} /></Campo>
          <Campo etiqueta="Remito"><input name="remito" defaultValue={previo('remito') ?? salida?.remito ?? ''} className={entrada} /></Campo>
          <Campo etiqueta="Estado">
            <select name="estado" defaultValue={previo('estado') ?? salida?.estado ?? 'a_confirmar'} className={entrada}>
              {ESTADOS.map((e) => <option key={e.valor} value={e.valor}>{e.texto}</option>)}
            </select>
          </Campo>
        </div>
      </Bloque>

      <Bloque titulo="Carga y descarga">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Lugar de carga"><input name="lugarCarga" defaultValue={previo('lugarCarga') ?? salida?.lugarCarga ?? ''} className={entrada} /></Campo>
          <Campo etiqueta="Contacto"><input name="contactoCarga" defaultValue={previo('contactoCarga') ?? salida?.contactoCarga ?? ''} className={entrada} /></Campo>
          <Campo etiqueta="Telefono"><input name="telefonoCarga" defaultValue={previo('telefonoCarga') ?? salida?.telefonoCarga ?? ''} className={entrada} /></Campo>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Lugar de descarga"><input name="lugarDescarga" defaultValue={previo('lugarDescarga') ?? salida?.lugarDescarga ?? ''} className={entrada} /></Campo>
          <Campo etiqueta="Contacto"><input name="contactoDescarga" defaultValue={previo('contactoDescarga') ?? salida?.contactoDescarga ?? ''} className={entrada} /></Campo>
          <Campo etiqueta="Telefono"><input name="telefonoDescarga" defaultValue={previo('telefonoDescarga') ?? salida?.telefonoDescarga ?? ''} className={entrada} /></Campo>
        </div>
      </Bloque>

      <Bloque titulo="Personal">
        <div className="space-y-3">
          {cuadrilla.map((fila, i) => (
            <div key={`${i}-${fila.personalId}-${fila.rol}`} className="grid gap-3 sm:grid-cols-[1fr_180px_140px_auto] sm:items-end">
              <Campo etiqueta={i === 0 ? 'Persona' : ''}>
                <select
                  name="personalId"
                  defaultValue={fila.personalId || ''}
                  className={entrada}
                >
                  <option value="">Elegi una persona</option>
                  {personal.map((p) => <option key={p.valor} value={p.valor}>{p.texto}</option>)}
                </select>
              </Campo>

              <Campo etiqueta={i === 0 ? 'Rol' : ''}>
                <select name="personalRol" defaultValue={fila.rol} className={entrada}>
                  {ROLES.map((r) => <option key={r.valor} value={r.valor}>{r.texto}</option>)}
                </select>
              </Campo>

              {/* Select y no casilla: una casilla sin marcar no se manda, y las
                  filas dejarian de coincidir con las personas. */}
              <Campo etiqueta={i === 0 ? 'Titular' : ''}>
                <select name="personalSuplente" defaultValue={fila.esSuplente ? 'si' : 'no'} className={entrada}>
                  <option value="no">Titular</option>
                  <option value="si">Suplente</option>
                </select>
              </Campo>

              <button
                type="button"
                onClick={() => setCuadrilla(cuadrilla.filter((_, j) => j !== i))}
                className="pb-2 text-sm text-[var(--color-tenue)] hover:text-red-700"
              >
                Sacar
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setCuadrilla([...cuadrilla, { personalId: 0, rol: 'ayudante', esSuplente: false }])}
          className="mt-3 rounded-md border border-[var(--color-borde)] px-3 py-2 text-sm hover:bg-[var(--color-fondo)]"
        >
          Agregar persona
        </button>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Campo etiqueta="Verificador">
            <select name="verificadorId" defaultValue={previo('verificadorId') ?? salida?.verificadorId ?? ''} className={entrada}>
              <option value="">Sin verificador</option>
              {verificadores.map((v) => <option key={v.valor} value={v.valor}>{v.texto}</option>)}
            </select>
          </Campo>

          <Campo etiqueta="Operador">
            <select name="operadorId" defaultValue={previo('operadorId') ?? salida?.operadorId ?? ''} className={entrada}>
              <option value="">Sin operador</option>
              {operadores.map((o) => <option key={o.valor} value={o.valor}>{o.texto}</option>)}
            </select>
          </Campo>

          <Campo etiqueta="Gestion">
            <select name="gestion" defaultValue={previo('gestion') ?? salida?.gestion ?? ''} className={entrada}>
              <option value="">Sin gestion</option>
              {GESTIONES.map((g) => <option key={g.valor} value={g.valor}>{g.texto}</option>)}
            </select>
          </Campo>
        </div>

        <div className="mt-4">
          <Campo etiqueta="Observaciones">
            <textarea name="observaciones" rows={3} defaultValue={previo('observaciones') ?? salida?.observaciones ?? ''} className={entrada} />
          </Campo>
        </div>
      </Bloque>

      <div className="space-y-4 p-6">
        {estado.error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{estado.error}</p>
        ) : null}

        {estado.avisos && estado.avisos.length > 0 ? (
          <div className="rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-medium">Ojo, hay cruces:</p>
            <ul className="mt-1 list-disc pl-5">
              {estado.avisos.map((a) => <li key={a}>{a}</li>)}
            </ul>
            <p className="mt-2">Se puede guardar igual si ya esta resuelto.</p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {estado.avisos && estado.avisos.length > 0 ? (
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Guardar igual
            </button>
          ) : (
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-[var(--color-acento)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {enviando ? 'Guardando...' : 'Guardar'}
            </button>
          )}

          <Link href="/salidas" className="text-sm text-[var(--color-tenue)] hover:underline">Cancelar</Link>
        </div>
      </div>
    </form>
  )
}

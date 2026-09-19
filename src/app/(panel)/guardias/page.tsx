import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { personal } from '@/db/schema'
import { agregarGuardia, quitarGuardia } from './acciones'
import { Boton, ErrorCampo, Etiquetita, Panel, SinDato, Titulo, Vacio } from '@/components/ui'
import { NavegadorFecha } from '@/components/navegador-fecha'
import { formatearFecha, hoy } from '@/lib/formato'
import { PUESTOS, guardiaDelDia, nombreDePuesto } from '@/lib/guardias'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

/** Quién está de guardia cada día. Alimenta la tarjeta del tablero. */
export default async function Guardias({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; error?: string }>
}) {
  const sesion = await sesionRequerida()
  const { fecha: fechaBuscada, error } = await searchParams
  const fecha = fechaBuscada ?? hoy()

  const [guardia, gente] = await Promise.all([
    guardiaDelDia(fecha),
    db.select().from(personal).where(eq(personal.activo, true)).orderBy(asc(personal.apellidoNombre)),
  ])

  const editable = puede(sesion.user.rol, 'editar_salidas')

  const entrada =
    'mt-1 w-full rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--color-acento)]'

  return (
    <main className="mx-auto w-full max-w-[1000px] flex-grow px-6 py-5">
      <Titulo
        bajada={formatearFecha(fecha)}
        accion={
          <NavegadorFecha fecha={fecha} hoy={hoy()} ruta="/guardias" />
        }
      >
        Guardia del día
      </Titulo>

      {error ? <div className="mb-4"><ErrorCampo>{error}</ErrorCampo></div> : null}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Panel titulo="Puestos cubiertos">
          {guardia.length === 0 ? (
            <Vacio>Todavía no hay nadie de guardia ese día.</Vacio>
          ) : (
            <ul className="divide-y divide-[var(--color-borde)]">
              {guardia.map((g) => (
                <li key={g.id} className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
                  <span className="hdg w-32 flex-shrink-0 font-semibold text-[var(--color-tenue)]">
                    {nombreDePuesto(g.rol)}
                  </span>
                  <span className="flex-grow font-medium">{g.nombre}</span>
                  <span className="mono text-[12px] text-[var(--color-tenue)]">
                    {g.telefono ?? <SinDato />}
                  </span>
                  {editable ? (
                    <form action={quitarGuardia}>
                      <input type="hidden" name="id" value={g.id} />
                      <input type="hidden" name="fecha" value={fecha} />
                      <button type="submit" className="text-[11.5px] text-[var(--color-tenue-2)] hover:text-[#a32020]">
                        Quitar
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {editable ? (
          <Panel titulo="Sumar a la guardia">
            <form action={agregarGuardia} className="space-y-3 p-4">
              <input type="hidden" name="fecha" value={fecha} />

              <label className="block">
                <Etiquetita>Puesto</Etiquetita>
                <select name="rol" className={entrada}>
                  {PUESTOS.map((p) => (
                    <option key={p.rol} value={p.rol}>{p.texto}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <Etiquetita>Persona</Etiquetita>
                <select name="personalId" required className={entrada}>
                  <option value="">Elegí una persona</option>
                  {gente.map((p) => (
                    <option key={p.id} value={p.id}>{p.apellidoNombre}</option>
                  ))}
                </select>
              </label>

              <Boton type="submit">Sumar</Boton>

              <p className="text-[11px] text-[var(--color-tenue)]">
                Puede haber más de una persona en el mismo puesto.
              </p>
            </form>
          </Panel>
        ) : null}
      </div>
    </main>
  )
}

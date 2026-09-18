import Link from 'next/link'
import { and, asc, eq, gte, inArray, lte, ne } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, empresas, equipos, salidas } from '@/db/schema'
import { BotonLink, Titulo } from '@/components/ui'
import { empresasElegidas } from '@/lib/empresas-elegidas'
import { formatearHora, hoy } from '@/lib/formato'
import {
  GRUPOS, colorDeGrupo, diasDeLaSemana, grupoDeTipo, mesYAnio,
  nombreDia, numeroDia, semanasDelMes, sumarDias, sumarMeses,
} from '@/lib/calendario'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

type Vista = 'mes' | 'semana' | 'dia'

/** Calendario de trabajos: se alimenta solo de las salidas (capitulo 6 del spec). */
export default async function Calendario({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>
}) {
  const sesion = await sesionRequerida()
  const { vista: vistaPedida, fecha: fechaPedida } = await searchParams

  const vista: Vista = vistaPedida === 'mes' || vistaPedida === 'dia' ? vistaPedida : 'semana'
  const fecha = fechaPedida ?? hoy()
  const elegidas = await empresasElegidas()

  const dias = vista === 'dia' ? [fecha] : vista === 'semana' ? diasDeLaSemana(fecha) : semanasDelMes(fecha).flat()
  const desde = dias[0]
  const hasta = dias[dias.length - 1]

  const filas = await db
    .select({
      id: salidas.id,
      fecha: salidas.fecha,
      horaSalida: salidas.horaSalida,
      estado: salidas.estado,
      interno: equipos.interno,
      tipo: equipos.tipo,
      cliente: clientes.razonSocial,
      empresa: empresas.nombreCorto,
      lugarDescarga: salidas.lugarDescarga,
    })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .leftJoin(clientes, eq(salidas.clienteId, clientes.id))
    .where(
      and(
        gte(salidas.fecha, desde),
        lte(salidas.fecha, hasta),
        ne(salidas.estado, 'anulado'),
        elegidas ? inArray(salidas.empresaId, elegidas) : undefined,
      ),
    )
    .orderBy(asc(salidas.fecha), asc(salidas.horaSalida), asc(equipos.interno))

  const deDia = (dia: string) => filas.filter((f) => f.fecha === dia)

  const anterior = vista === 'mes' ? sumarMeses(fecha, -1) : sumarDias(fecha, vista === 'semana' ? -7 : -1)
  const siguiente = vista === 'mes' ? sumarMeses(fecha, 1) : sumarDias(fecha, vista === 'semana' ? 7 : 1)

  const titulo =
    vista === 'mes' ? mesYAnio(fecha)
      : vista === 'semana' ? `Semana del ${numeroDia(dias[0])} al ${numeroDia(dias[6])} de ${mesYAnio(dias[6])}`
        : `${nombreDia(fecha)} ${numeroDia(fecha)} de ${mesYAnio(fecha)}`

  const enlace = (v: Vista, f: string) => `/calendario?vista=${v}&fecha=${f}`

  /** Una salida en el calendario. */
  function Evento({ f }: { f: (typeof filas)[number] }) {
    const color = colorDeGrupo(grupoDeTipo(f.tipo))
    const aConfirmar = f.estado === 'a_confirmar'
    return (
      <Link
        href={`/salidas/${f.id}`}
        className="block rounded-[4px] px-2.5 py-[7px] text-[11.5px] leading-[1.35]"
        style={{
          background: color.fondo,
          borderLeft: `3px ${aConfirmar ? 'dashed' : 'solid'} ${color.color}`,
        }}
      >
        <span className="mono font-semibold">
          {formatearHora(f.horaSalida) || '--:--'} {f.interno}
        </span>
        <br />
        {f.cliente ?? f.empresa}
        {f.lugarDescarga ? ` — ${f.lugarDescarga}` : ''}
      </Link>
    )
  }

  function Dia({ dia, limite }: { dia: string; limite: number }) {
    const delDia = deDia(dia)
    const esHoy = dia === hoy()
    const visibles = delDia.slice(0, limite)

    return (
      <div className={`flex min-h-[150px] flex-col border-r border-[var(--color-borde)] last:border-r-0 ${esHoy ? 'bg-[#fdfaf5]' : ''}`}>
        <div className={`flex items-baseline gap-2 border-b border-[var(--color-borde)] px-3 py-2 ${esHoy ? 'border-t-[3px] border-t-[var(--color-acento)]' : ''}`}>
          <span className={`hdg text-[12px] font-semibold ${esHoy ? 'text-[var(--color-acento)]' : 'text-[var(--color-tenue)]'}`}>
            {nombreDia(dia)}{esHoy ? ' — hoy' : ''}
          </span>
          <span className="mono text-[15px] font-semibold">{numeroDia(dia)}</span>
          <span className="ml-auto text-[11px] text-[var(--color-tenue-2)]">
            {delDia.length > 0 ? `${delDia.length} ${delDia.length === 1 ? 'salida' : 'salidas'}` : ''}
          </span>
        </div>

        <div className="flex flex-col gap-1.5 p-2">
          {visibles.map((f) => <Evento key={f.id} f={f} />)}
          {delDia.length > limite ? (
            <Link href={enlace('dia', dia)} className="enlace mono px-1 text-[11px] font-semibold">
              +{delDia.length - limite} más
            </Link>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-6 py-5">
      <Titulo
        bajada={<>{titulo} · {filas.length} {filas.length === 1 ? 'salida' : 'salidas'}</>}
        accion={
          <>
            <div className="flex items-center rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white">
              <Link href={enlace(vista, anterior)} className="px-3 py-2 text-[13px]">‹</Link>
              <Link href={enlace(vista, hoy())} className="hdg border-x border-[var(--color-borde)] px-3 py-2 text-[13px] font-semibold">
                Hoy
              </Link>
              <Link href={enlace(vista, siguiente)} className="px-3 py-2 text-[13px]">›</Link>
            </div>

            <div className="flex items-center overflow-hidden rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white">
              {(['mes', 'semana', 'dia'] as Vista[]).map((v) => (
                <Link
                  key={v}
                  href={enlace(v, fecha)}
                  className={`hdg px-3.5 py-2 text-[13px] font-semibold ${
                    v === vista ? 'bg-[var(--color-texto)] text-white' : 'text-[var(--color-tenue)]'
                  }`}
                >
                  {v === 'dia' ? 'Día' : v}
                </Link>
              ))}
            </div>

            {puede(sesion.user.rol, 'editar_salidas') ? (
              <BotonLink href={`/salidas/nueva?fecha=${fecha}`}>Nueva salida</BotonLink>
            ) : null}
          </>
        }
      >
        Calendario de trabajos
      </Titulo>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-[12px]">
        {GRUPOS.map((g) => (
          <span key={g.grupo} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: g.color }} />
            {g.texto}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-1.5 text-[var(--color-tenue)]">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] border-l-[3px] border-dashed border-[var(--color-tenue-2)] bg-[var(--color-neutro-suave)]" />
          A confirmar
        </span>
      </div>

      <div className="overflow-hidden rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)]">
        {vista === 'dia' ? (
          <Dia dia={fecha} limite={50} />
        ) : vista === 'semana' ? (
          <div className="grid grid-cols-7">
            {dias.map((d) => <Dia key={d} dia={d} limite={6} />)}
          </div>
        ) : (
          <div>
            {semanasDelMes(fecha).map((semana) => (
              <div key={semana[0]} className="grid grid-cols-7 border-b border-[var(--color-borde)] last:border-b-0">
                {semana.map((d) => <Dia key={d} dia={d} limite={3} />)}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

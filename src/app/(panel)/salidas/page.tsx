import Link from 'next/link'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, empresas, equipos, salidas } from '@/db/schema'
import { BotonLink, Celda, Etiqueta, Fila, Panel, SinDato, Tabla, Titulo, Vacio } from '@/components/ui'
import { NavegadorFecha } from '@/components/navegador-fecha'
import { empresasElegidas } from '@/lib/empresas-elegidas'
import { formatearFecha, formatearHora, hoy, ZONA_HORARIA } from '@/lib/formato'
import { puede, sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const ETIQUETA_ESTADO = {
  a_confirmar: { texto: 'A confirmar', estilo: 'neutra' },
  en_ejecucion: { texto: 'En ejecución', estilo: 'acento' },
  finalizado: { texto: 'Finalizado', estilo: 'verde' },
  anulado: { texto: 'Anulado', estilo: 'apagada' },
} as const

function fechaLarga(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: ZONA_HORARIA, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(Date.UTC(anio, mes - 1, dia, 12)))
}

export default async function Salidas({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; guardada?: string }>
}) {
  const sesion = await sesionRequerida()
  const { fecha: fechaBuscada, guardada } = await searchParams
  const fecha = fechaBuscada ?? hoy()

  // Si el usuario eligio empresas en la cabecera, solo ve las de esas.
  const elegidas = await empresasElegidas()

  const filas = await db
    .select({
      id: salidas.id,
      numero: salidas.numero,
      ordenDia: salidas.ordenDia,
      horaSalida: salidas.horaSalida,
      estado: salidas.estado,
      ot: salidas.ot,
      lugarCarga: salidas.lugarCarga,
      lugarDescarga: salidas.lugarDescarga,
      cliente: clientes.razonSocial,
      interno: equipos.interno,
      marca: equipos.marca,
      modelo: equipos.modelo,
      empresa: empresas.nombreCorto,
    })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .leftJoin(clientes, eq(salidas.clienteId, clientes.id))
    .where(
      and(
        eq(salidas.fecha, fecha),
        elegidas ? inArray(salidas.empresaId, elegidas) : undefined,
      ),
    )
    .orderBy(asc(salidas.horaSalida), asc(equipos.interno), asc(salidas.ordenDia))

  const editable = puede(sesion.user.rol, 'editar_salidas')

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-grow px-6 py-5">
      <Titulo
        bajada={<>{fechaLarga(fecha)} · {filas.length} {filas.length === 1 ? 'salida' : 'salidas'}{elegidas ? ' en las empresas elegidas' : ''}</>}
        accion={
          <>
            <NavegadorFecha fecha={fecha} hoy={hoy()} ruta="/salidas" />

            <BotonLink href="/salidas/buscar" estilo="blanco">Buscar</BotonLink>

            <BotonLink href={`/api/pdf/dia/${fecha}${elegidas ? `?empresas=${elegidas.join(',')}` : ''}`} estilo="blanco" nuevaPestania>
              PDF del día
            </BotonLink>

            {editable ? <BotonLink href={`/salidas/nueva?fecha=${fecha}`}>+ Nueva salida</BotonLink> : null}
          </>
        }
      >
        Salidas de trabajo
      </Titulo>

      {guardada ? (
        <p className="mb-4 rounded-[5px] bg-[var(--color-verde-suave)] px-3 py-2 text-[13px] text-[var(--color-verde-texto)]">
          Salida guardada.
        </p>
      ) : null}

      <Panel>
        {filas.length === 0 ? (
          <Vacio>No hay salidas cargadas para ese día.</Vacio>
        ) : (
          <Tabla cabeceras={['Hora', 'Unidad', 'N°', 'Trabajo', 'Cliente / OT', 'Empresa', 'Carga → Descarga', 'Estado']}>
            {filas.map((s) => {
              const etiqueta = ETIQUETA_ESTADO[s.estado]
              return (
                <Fila key={s.id}>
                  <Celda className="mono font-medium">{formatearHora(s.horaSalida) || <SinDato />}</Celda>
                  <Celda>
                    <Link href={`/salidas/${s.id}`} className="mono font-semibold">{s.interno}</Link>
                    <div className="text-[11px] text-[var(--color-tenue)]">
                      {[s.marca, s.modelo].filter(Boolean).join(' ')}
                    </div>
                  </Celda>
                  <Celda className="mono text-[var(--color-tenue)]">{s.numero}</Celda>
                  <Celda className="mono">{s.ordenDia}</Celda>
                  <Celda>
                    <div className="font-medium">{s.cliente ?? <SinDato />}</div>
                    {s.ot ? <div className="mono text-[11px] text-[var(--color-tenue)]">OT {s.ot}</div> : null}
                  </Celda>
                  <Celda>{s.empresa}</Celda>
                  <Celda className="text-[var(--color-tenue)]">
                    {s.lugarCarga || s.lugarDescarga
                      ? `${s.lugarCarga ?? '—'} → ${s.lugarDescarga ?? '—'}`
                      : <SinDato />}
                  </Celda>
                  <Celda><Etiqueta estilo={etiqueta.estilo}>{etiqueta.texto}</Etiqueta></Celda>
                </Fila>
              )
            })}
          </Tabla>
        )}
      </Panel>
    </main>
  )
}

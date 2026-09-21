import Link from 'next/link'
import { Celda, Etiqueta, Fila, Panel, SinDato, Tabla, Titulo, Vacio } from '@/components/ui'
import { FiltrosAuditoria } from '@/components/filtros-auditoria'
import {
  POR_PAGINA,
  entidadesAuditadas,
  registrosDeAuditoria,
  usuariosConAuditoria,
} from '@/lib/consultas-auditoria'
import {
  ETIQUETAS_ACCION,
  etiquetaDeAccion,
  etiquetaDeEntidad,
  resumenDeCambios,
} from '@/lib/cambios'
import { enlaceDeEntidad } from '@/lib/enlaces-auditoria'
import { formatearFechaHora } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

const COLOR_ACCION: Record<string, 'verde' | 'acento' | 'neutra'> = {
  alta: 'verde',
  edicion: 'neutra',
  baja: 'acento',
  reapertura: 'acento',
}

export default async function Auditoria({
  searchParams,
}: {
  searchParams: Promise<{
    entidad?: string
    accion?: string
    usuario?: string
    desde?: string
    hasta?: string
    pagina?: string
  }>
}) {
  await permisoRequerido('ver_auditoria')
  const params = await searchParams

  const entidad = params.entidad ?? ''
  const accion = params.accion ?? ''
  const usuario = params.usuario ?? ''
  const desde = params.desde ?? ''
  const hasta = params.hasta ?? ''
  const pagina = Math.max(1, Number(params.pagina) || 1)

  const [{ filas, total, paginas }, entidades, usuarios] = await Promise.all([
    registrosDeAuditoria(
      {
        entidad: entidad || undefined,
        accion: accion || undefined,
        usuarioId: usuario ? Number(usuario) : undefined,
        desde: desde || undefined,
        hasta: hasta || undefined,
      },
      pagina,
    ),
    entidadesAuditadas(),
    usuariosConAuditoria(),
  ])

  const filtro = new URLSearchParams()
  for (const [clave, valor] of Object.entries({ entidad, accion, usuario, desde, hasta })) {
    if (valor) filtro.set(clave, valor)
  }
  const enlacePagina = (n: number) => {
    const p = new URLSearchParams(filtro)
    if (n > 1) p.set('pagina', String(n))
    return p.size ? `/auditoria?${p}` : '/auditoria'
  }

  const primera = total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1
  const ultima = Math.min(pagina * POR_PAGINA, total)

  return (
    <main className="mx-auto w-full max-w-[1200px] flex-grow px-6 py-5">
      <Titulo bajada="Quién cambió qué y cuándo. No se edita ni se borra.">Registro de cambios</Titulo>

      <FiltrosAuditoria
        entidad={entidad}
        accion={accion}
        usuarioId={usuario}
        desde={desde}
        hasta={hasta}
        entidades={entidades.map((e) => ({ valor: e, texto: etiquetaDeEntidad(e) }))}
        usuarios={usuarios.map((u) => ({ valor: String(u.id), texto: u.email }))}
        acciones={Object.entries(ETIQUETAS_ACCION).map(([valor, texto]) => ({ valor, texto }))}
      />

      <Panel>
        {filas.length === 0 ? (
          <Vacio>
            {total === 0 && !filtro.size
              ? 'Todavía no hay movimientos registrados.'
              : 'No hay movimientos con esos filtros.'}
          </Vacio>
        ) : (
          <Tabla cabeceras={['Cuándo', 'Usuario', 'Qué', 'Acción', 'Campos', '']}>
            {filas.map((f) => {
              const enlace = enlaceDeEntidad(f.entidad, f.entidadId)
              const resumen = resumenDeCambios(f.antes, f.despues)
              return (
                <Fila key={f.id}>
                  <Celda className="mono whitespace-nowrap text-[12.5px]">
                    {formatearFechaHora(f.createdAt)}
                  </Celda>
                  <Celda>{f.email ?? <SinDato />}</Celda>
                  <Celda>
                    {enlace ? (
                      <Link href={enlace} className="enlace">
                        {etiquetaDeEntidad(f.entidad)} #{f.entidadId}
                      </Link>
                    ) : (
                      <span>
                        {etiquetaDeEntidad(f.entidad)}
                        {f.entidadId ? ` #${f.entidadId}` : ''}
                      </span>
                    )}
                  </Celda>
                  <Celda>
                    <Etiqueta estilo={COLOR_ACCION[f.accion] ?? 'neutra'}>
                      {etiquetaDeAccion(f.accion)}
                    </Etiqueta>
                  </Celda>
                  <Celda className="text-[var(--color-tenue)]">{resumen || <SinDato />}</Celda>
                  <Celda className="text-right">
                    <Link href={`/auditoria/${f.id}`} className="enlace text-[12px]">Ver detalle</Link>
                  </Celda>
                </Fila>
              )
            })}
          </Tabla>
        )}
      </Panel>

      {total > 0 ? (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-[var(--color-tenue)]">
          <span>
            {primera}–{ultima} de {total}
          </span>
          {paginas > 1 ? (
            <div className="flex items-center gap-3">
              {pagina > 1 ? <Link href={enlacePagina(pagina - 1)} className="enlace">‹ Anterior</Link> : null}
              <span>Página {pagina} de {paginas}</span>
              {pagina < paginas ? <Link href={enlacePagina(pagina + 1)} className="enlace">Siguiente ›</Link> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </main>
  )
}

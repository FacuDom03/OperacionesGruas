import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Celda, Fila, Panel, Tabla, Titulo, Vacio } from '@/components/ui'
import { registroDeAuditoria } from '@/lib/consultas-auditoria'
import { cambios, etiquetaDeAccion, etiquetaDeCampo, etiquetaDeEntidad, valorLegible } from '@/lib/cambios'
import { enlaceDeEntidad } from '@/lib/enlaces-auditoria'
import { formatearFechaHora } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function DetalleAuditoria({ params }: { params: Promise<{ id: string }> }) {
  await permisoRequerido('ver_auditoria')
  const { id } = await params

  const registro = await registroDeAuditoria(Number(id))
  if (!registro) notFound()

  const lista = cambios(registro.antes, registro.despues)
  const enlace = enlaceDeEntidad(registro.entidad, registro.entidadId)
  const esAlta = registro.accion === 'alta'
  const esBaja = registro.accion === 'baja'

  return (
    <main className="mx-auto w-full max-w-[900px] flex-grow px-6 py-5">
      <Link href="/auditoria" className="enlace text-[12.5px]">‹ Volver al registro</Link>

      <div className="mt-2">
        <Titulo
          bajada={`${formatearFechaHora(registro.createdAt)} · ${registro.email ?? 'usuario dado de baja'}`}
        >
          {etiquetaDeAccion(registro.accion)} de {etiquetaDeEntidad(registro.entidad).toLowerCase()}
          {registro.entidadId ? ` #${registro.entidadId}` : ''}
        </Titulo>
      </div>

      {enlace ? (
        <p className="mb-4 text-[13px]">
          <Link href={enlace} className="enlace">Ver el registro actual</Link>
          <span className="text-[var(--color-tenue)]"> — puede haber cambiado desde entonces.</span>
        </p>
      ) : null}

      <Panel titulo={esAlta ? 'Con qué se dio de alta' : esBaja ? 'Qué tenía al darse de baja' : 'Qué cambió'}>
        {lista.length === 0 ? (
          <Vacio>La línea no guarda diferencias de campos.</Vacio>
        ) : (
          <Tabla cabeceras={esAlta ? ['Campo', 'Valor'] : esBaja ? ['Campo', 'Valor'] : ['Campo', 'Antes', 'Después']}>
            {lista.map((c) => (
              <Fila key={c.campo}>
                <Celda className="font-medium">{etiquetaDeCampo(c.campo)}</Celda>
                {esAlta ? (
                  <Celda className="mono text-[12.5px]">{valorLegible(c.despues)}</Celda>
                ) : esBaja ? (
                  <Celda className="mono text-[12.5px]">{valorLegible(c.antes)}</Celda>
                ) : (
                  <>
                    <Celda className="mono text-[12.5px] text-[var(--color-tenue)]">{valorLegible(c.antes)}</Celda>
                    <Celda className="mono text-[12.5px]">{valorLegible(c.despues)}</Celda>
                  </>
                )}
              </Fila>
            ))}
          </Tabla>
        )}
      </Panel>

      <p className="mt-4 text-[12px] text-[var(--color-tenue)]">
        Los identificadores (empresa, equipo, persona) se guardan como número
        porque es lo que tenía la fila en ese momento: el nombre pudo cambiar después.
      </p>
    </main>
  )
}

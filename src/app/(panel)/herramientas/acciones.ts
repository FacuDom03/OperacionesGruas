'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { herramientas } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { normalizarCodigoHerramienta, textoONulo } from '@/lib/formato'
import { columnasDeDestino, leerDestino } from '@/lib/herramientas'
import { registrarEntrega } from '@/lib/mover-herramientas'
import { permisoRequerido } from '@/lib/permisos'

export async function guardarHerramienta(datos: FormData) {
  const sesion = await permisoRequerido('editar_maestros')

  const id = Number(datos.get('id')) || null
  const volverA = id ? `/herramientas/${id}` : '/herramientas/nueva'

  const codigoEscrito = textoONulo(datos.get('codigo'))
  const nombre = textoONulo(datos.get('nombre'))
  const destino = leerDestino(String(datos.get('custodia') ?? ''))

  const error = (mensaje: string) => redirect(`${volverA}?error=${encodeURIComponent(mensaje)}`)

  if (!codigoEscrito || !nombre) error('El codigo y el nombre son obligatorios.')

  const codigo = normalizarCodigoHerramienta(codigoEscrito!)
  if (!/^GDH\d{3}$/.test(codigo)) {
    error(`"${codigoEscrito}" no es un codigo valido. Va GDH y tres digitos, por ejemplo GDH001.`)
  }

  // Sin custodia no hay "donde esta", que es todo el punto de esta pantalla.
  // En la edicion no se pide: la custodia se mueve con una entrega.
  if (!id && !destino) error('Decinos donde esta la herramienta.')

  const empresaId = Number(datos.get('empresaId')) || null
  const estado = String(datos.get('estado') ?? 'activa') as 'activa' | 'en_reparacion' | 'perdida' | 'baja'

  const base = {
    codigo,
    nombre: nombre!,
    tipo: textoONulo(datos.get('tipo')),
    marca: textoONulo(datos.get('marca')),
    modelo: textoONulo(datos.get('modelo')),
    numeroSerie: textoONulo(datos.get('numeroSerie')),
    empresaId,
    estado,
    observaciones: textoONulo(datos.get('observaciones')),
    updatedAt: new Date(),
  }

  try {
    if (id) {
      const [antes] = await db.select().from(herramientas).where(eq(herramientas.id, id)).limit(1)
      // La custodia no se edita desde acá: se mueve con una entrega, que deja
      // historial. Editarla a mano dejaría el historial mintiendo.
      const [despues] = await db.update(herramientas).set(base).where(eq(herramientas.id, id)).returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'herramientas', entidadId: id, accion: 'edicion', antes, despues })
    } else {
      const custodia = columnasDeDestino(destino!)
      const [despues] = await db
        .insert(herramientas)
        .values({
          ...base,
          custodiaPersonalId: custodia.personalId,
          custodiaEquipoId: custodia.equipoId,
          custodiaLugarId: custodia.lugarId,
          custodiaDesde: new Date(),
        })
        .returning()
      await auditar({ usuarioId: Number(sesion.user.id), entidad: 'herramientas', entidadId: despues.id, accion: 'alta', despues })
    }
  } catch (e) {
    error(mensajeDeError(e, { codigo: 'Ya hay otra herramienta con ese codigo.' }))
  }

  revalidatePath('/herramientas')
  redirect('/herramientas?guardada=1')
}

/**
 * El acta de entrega. Devuelve el link de confirmacion en la query para que la
 * pantalla lo muestre una sola vez: en la base queda el hash, no se puede
 * recuperar despues.
 */
export async function entregarHerramientas(datos: FormData) {
  const sesion = await permisoRequerido('mover_herramientas')

  const destino = leerDestino(String(datos.get('destino') ?? ''))
  const ids = datos.getAll('herramientas').map(Number).filter((n) => Number.isInteger(n) && n > 0)
  const volverA = '/herramientas/entregar'

  const error = (mensaje: string) => redirect(`${volverA}?error=${encodeURIComponent(mensaje)}`)

  if (!destino) error('Decinos a quien se la entregas.')
  if (ids.length === 0) error('Elegi al menos una herramienta.')

  let resultado
  try {
    resultado = await registrarEntrega({
      destino: destino!,
      herramientaIds: ids,
      usuarioId: Number(sesion.user.id),
      observaciones: textoONulo(datos.get('observaciones')),
    })
  } catch (e) {
    error(mensajeDeError(e, {}))
  }

  revalidatePath('/herramientas')

  const params = new URLSearchParams({ entrega: String(resultado!.entregaId) })
  if (resultado!.token) params.set('token', resultado!.token)
  if (resultado!.rechazadas.length > 0) {
    params.set('rechazadas', resultado!.rechazadas.map((r) => `${r.codigo} (${r.motivo})`).join(', '))
  }
  redirect(`/herramientas?${params}`)
}

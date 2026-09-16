'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { salidaPersonal, salidas } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { mensajeDeError } from '@/lib/errores'
import { textoONulo } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'
import { avisosDeSolapamiento, proximoNumero } from '@/lib/salidas'

export type EstadoFormulario = {
  error?: string
  /** Solapamientos encontrados. Se muestran y se deja guardar igual. */
  avisos?: string[]
  /**
   * Lo que el usuario acababa de escribir. Hay que devolverlo porque React
   * limpia el formulario cuando la accion termina: sin esto, ver un aviso
   * significaria volver a cargar toda la salida de cero.
   */
  enviado?: Record<string, string>
  /** Idem para las filas de la cuadrilla. */
  cuadrilla?: { personalId: number; rol: string; esSuplente: boolean }[]
}

/** Copia plana de lo enviado, para poder repoblar el formulario. */
function loEnviado(datos: FormData): Record<string, string> {
  const copia: Record<string, string> = {}
  for (const [clave, valor] of datos.entries()) {
    if (typeof valor === 'string' && !clave.startsWith('$') && !clave.startsWith('personal')) {
      copia[clave] = valor
    }
  }
  return copia
}

type RolSalida = 'chofer' | 'operador_grua' | 'jefe_cuadrilla' | 'ayudante' | 'acompanante'

/** Lee las filas de personal del formulario: persona, rol y si es suplente. */
function leerCuadrilla(datos: FormData) {
  const personas = datos.getAll('personalId').map(String)
  const roles = datos.getAll('personalRol').map(String)
  const suplentes = datos.getAll('personalSuplente').map(String)

  const cuadrilla: { personalId: number; rol: RolSalida; esSuplente: boolean }[] = []
  const vistas = new Set<number>()

  personas.forEach((valor, i) => {
    const personalId = Number(valor)
    if (!personalId || vistas.has(personalId)) return
    vistas.add(personalId)
    cuadrilla.push({
      personalId,
      rol: (roles[i] || 'ayudante') as RolSalida,
      esSuplente: suplentes[i] === 'si',
    })
  })

  return cuadrilla
}

export async function guardarSalida(
  previo: EstadoFormulario,
  datos: FormData,
): Promise<EstadoFormulario> {
  const sesion = await permisoRequerido('editar_salidas')

  const id = Number(datos.get('id')) || null
  const fecha = textoONulo(datos.get('fecha'))
  const equipoId = Number(datos.get('equipoId')) || null
  const empresaId = Number(datos.get('empresaId')) || null
  const ordenDia = Number(datos.get('ordenDia')) || 1

  const enviado = loEnviado(datos)
  const cuadrillaEnviada = leerCuadrilla(datos)
  const conDatos = (estado: EstadoFormulario): EstadoFormulario =>
    ({ ...estado, enviado, cuadrilla: cuadrillaEnviada })

  if (!fecha || !equipoId || !empresaId) {
    return conDatos({ error: 'La fecha, la unidad y la empresa son obligatorias.' })
  }
  if (ordenDia < 1 || ordenDia > 4) {
    return conDatos({ error: 'El numero de trabajo va de 1 a 4.' })
  }

  // Una salida finalizada no se edita: la reabre un admin y queda en auditoria
  // (regla 4 del capitulo 4 del spec).
  if (id) {
    const [actual] = await db.select().from(salidas).where(eq(salidas.id, id)).limit(1)
    if (!actual) return conDatos({ error: 'Esa salida ya no existe.' })
    if (actual.estado === 'finalizado') {
      return conDatos({ error: 'La salida esta finalizada. Para modificarla, un admin tiene que reabrirla.' })
    }
  }

  const horaSalida = textoONulo(datos.get('horaSalida'))
  const cuadrilla = cuadrillaEnviada

  const avisos = await avisosDeSolapamiento({
    salidaId: id,
    fecha,
    equipoId,
    horaSalida,
    personalIds: cuadrilla.map((c) => c.personalId),
  })

  // Se avisa una vez y se deja guardar igual (aviso, no bloqueo). La
  // confirmacion es volver a enviar con los mismos avisos a la vista: si los
  // avisos cambiaron porque cambiaron los datos, se muestran los nuevos antes
  // de guardar, en vez de dar por confirmado algo que el usuario no leyo.
  const yaMostrados = (previo.avisos ?? []).join(' | ')
  if (avisos.length > 0 && avisos.join(' | ') !== yaMostrados) {
    return conDatos({ avisos })
  }

  const valores = {
    fecha,
    ordenDia,
    equipoId,
    equipoAuxId: Number(datos.get('equipoAuxId')) || null,
    empresaId,
    clienteId: Number(datos.get('clienteId')) || null,
    ot: textoONulo(datos.get('ot')),
    remito: textoONulo(datos.get('remito')),
    horaSalida,
    lugarCarga: textoONulo(datos.get('lugarCarga')),
    contactoCarga: textoONulo(datos.get('contactoCarga')),
    telefonoCarga: textoONulo(datos.get('telefonoCarga')),
    lugarDescarga: textoONulo(datos.get('lugarDescarga')),
    contactoDescarga: textoONulo(datos.get('contactoDescarga')),
    telefonoDescarga: textoONulo(datos.get('telefonoDescarga')),
    verificadorId: Number(datos.get('verificadorId')) || null,
    operadorId: Number(datos.get('operadorId')) || null,
    gestion: (textoONulo(datos.get('gestion')) ?? null) as 'permiso_corte' | 'traslado_carreton' | 'otros' | null,
    estado: (textoONulo(datos.get('estado')) ?? 'a_confirmar') as 'a_confirmar' | 'en_ejecucion' | 'finalizado' | 'anulado',
    observaciones: textoONulo(datos.get('observaciones')),
  }

  let guardadaId = id

  try {
    await db.transaction(async (tx) => {
      if (id) {
        const [antes] = await tx.select().from(salidas).where(eq(salidas.id, id)).limit(1)
        const [despues] = await tx
          .update(salidas)
          .set({ ...valores, updatedAt: new Date() })
          .where(eq(salidas.id, id))
          .returning()

        await tx.delete(salidaPersonal).where(eq(salidaPersonal.salidaId, id))
        if (cuadrilla.length > 0) {
          await tx.insert(salidaPersonal).values(cuadrilla.map((c) => ({ ...c, salidaId: id })))
        }

        await auditar({
          usuarioId: Number(sesion.user.id),
          entidad: 'salidas', entidadId: id, accion: 'edicion', antes, despues,
        })
      } else {
        const numero = await proximoNumero(fecha)
        const [despues] = await tx
          .insert(salidas)
          .values({ ...valores, numero, creadoPor: Number(sesion.user.id) })
          .returning()

        guardadaId = despues.id
        if (cuadrilla.length > 0) {
          await tx.insert(salidaPersonal).values(cuadrilla.map((c) => ({ ...c, salidaId: despues.id })))
        }

        await auditar({
          usuarioId: Number(sesion.user.id),
          entidad: 'salidas', entidadId: despues.id, accion: 'alta', despues,
        })
      }
    })
  } catch (error) {
    return conDatos({
      error: mensajeDeError(error, {
        fecha_equipo_orden: 'Esa unidad ya tiene ese numero de trabajo en esa fecha.',
      }),
    })
  }

  revalidatePath('/salidas')
  redirect(`/salidas?fecha=${fecha}&guardada=${guardadaId}`)
}

/** Reabre una salida finalizada. Solo admin, y queda registrado. */
export async function reabrirSalida(datos: FormData) {
  const sesion = await permisoRequerido('reabrir_salida')

  const id = Number(datos.get('id'))
  if (!id) return

  const [antes] = await db.select().from(salidas).where(eq(salidas.id, id)).limit(1)
  if (!antes || antes.estado !== 'finalizado') redirect(`/salidas/${id}`)

  const [despues] = await db
    .update(salidas)
    .set({ estado: 'en_ejecucion', updatedAt: new Date() })
    .where(eq(salidas.id, id))
    .returning()

  await auditar({
    usuarioId: Number(sesion.user.id),
    entidad: 'salidas', entidadId: id, accion: 'reapertura', antes, despues,
  })

  revalidatePath(`/salidas/${id}`)
  redirect(`/salidas/${id}`)
}

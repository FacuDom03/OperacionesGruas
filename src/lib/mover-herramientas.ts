import { createHash, randomBytes } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { herramientaEntregas, herramientaMovimientos, herramientas } from '@/db/schema'
import { auditar } from '@/lib/auditoria'
import { columnasDeDestino, type Destino } from '@/lib/herramientas'

/**
 * El movimiento de herramientas, en una sola transaccion.
 *
 * La custodia esta guardada dos veces a proposito: el historial en
 * `herramienta_movimientos` y la actual, cacheada, en `herramientas`. Las dos
 * escrituras van juntas o no va ninguna, porque si discrepan el listado miente
 * y el listado es todo el punto de esto.
 */

/** Cuanto vive el link de confirmacion. Un mes: el empleado puede tardar. */
const DIAS_DE_TOKEN = 30

export function hashDeToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export type ResultadoEntrega = {
  entregaId: number
  /** El token en claro. Es la unica vez que existe: en la base va el hash. */
  token: string | null
  /** Las que no se movieron y por que. */
  rechazadas: { codigo: string; motivo: string }[]
}

export async function registrarEntrega(datos: {
  destino: Destino
  herramientaIds: number[]
  usuarioId: number | null
  salidaId?: number | null
  observaciones?: string | null
  /** Solo se genera el link cuando la recibe una persona: una unidad no confirma. */
  conConfirmacion?: boolean
}): Promise<ResultadoEntrega> {
  if (datos.herramientaIds.length === 0) {
    throw new Error('No elegiste ninguna herramienta.')
  }

  // Una herramienta que vuelve a un lugar es una devolucion; si se la lleva
  // alguien o queda arriba de una unidad, es una entrega.
  const tipo = datos.destino.tipo === 'lugar' ? 'devolucion' : 'entrega'
  const hacia = columnasDeDestino(datos.destino)

  const pideConfirmacion = (datos.conConfirmacion ?? true) && datos.destino.tipo === 'persona'
  const token = pideConfirmacion ? randomBytes(24).toString('base64url') : null

  return db.transaction(async (tx) => {
    const antes = await tx
      .select()
      .from(herramientas)
      .where(inArray(herramientas.id, datos.herramientaIds))
      .for('update')

    const rechazadas: { codigo: string; motivo: string }[] = []
    const aMover = antes.filter((h) => {
      if (h.estado === 'baja' || h.estado === 'perdida') {
        rechazadas.push({ codigo: h.codigo, motivo: h.estado === 'baja' ? 'esta dada de baja' : 'figura como perdida' })
        return false
      }
      return true
    })

    if (aMover.length === 0) {
      throw new Error('Ninguna de las herramientas elegidas se puede mover.')
    }

    const [entrega] = await tx
      .insert(herramientaEntregas)
      .values({
        tipo,
        haciaPersonalId: hacia.personalId,
        haciaEquipoId: hacia.equipoId,
        haciaLugarId: hacia.lugarId,
        salidaId: datos.salidaId ?? null,
        entregadoPor: datos.usuarioId,
        observaciones: datos.observaciones ?? null,
        tokenHash: token ? hashDeToken(token) : null,
        tokenVence: token ? new Date(Date.now() + DIAS_DE_TOKEN * 86_400_000) : null,
      })
      .returning()

    await tx.insert(herramientaMovimientos).values(
      aMover.map((h) => ({
        entregaId: entrega.id,
        herramientaId: h.id,
        desdePersonalId: h.custodiaPersonalId,
        desdeEquipoId: h.custodiaEquipoId,
        desdeLugarId: h.custodiaLugarId,
      })),
    )

    const ahora = new Date()
    for (const h of aMover) {
      await tx
        .update(herramientas)
        .set({
          custodiaPersonalId: hacia.personalId,
          custodiaEquipoId: hacia.equipoId,
          custodiaLugarId: hacia.lugarId,
          custodiaDesde: ahora,
          custodiaEntregaId: entrega.id,
          updatedAt: ahora,
        })
        .where(eq(herramientas.id, h.id))
    }

    await auditar({
      usuarioId: datos.usuarioId,
      entidad: 'herramienta_entregas',
      entidadId: entrega.id,
      accion: 'alta',
      despues: {
        tipo,
        destino: `${datos.destino.tipo}:${datos.destino.id}`,
        herramientas: aMover.map((h) => h.codigo),
        salidaId: datos.salidaId ?? null,
      },
    })

    return { entregaId: entrega.id, token, rechazadas }
  })
}

/**
 * Confirma una entrega desde el formulario publico. Devuelve false si el token
 * no sirve: vencido, ya confirmado o inventado.
 */
export async function confirmarEntrega(token: string, nota: string | null): Promise<boolean> {
  const [entrega] = await db
    .select()
    .from(herramientaEntregas)
    .where(eq(herramientaEntregas.tokenHash, hashDeToken(token)))
    .limit(1)

  if (!entrega || entrega.confirmadoAt) return false
  if (entrega.tokenVence && entrega.tokenVence < new Date()) return false

  await db
    .update(herramientaEntregas)
    .set({ confirmadoAt: new Date(), confirmadoNota: nota })
    .where(eq(herramientaEntregas.id, entrega.id))

  // Sin usuario: la confirmacion la hace el empleado desde el telefono, sin
  // sesion. Quien es surge de la propia entrega.
  await auditar({
    usuarioId: null,
    entidad: 'herramienta_entregas',
    entidadId: entrega.id,
    accion: 'edicion',
    antes: { confirmadoAt: null },
    despues: { confirmadoAt: new Date().toISOString(), confirmadoNota: nota },
  })

  return true
}

/** La entrega que corresponde a un token, para mostrar el formulario. */
export async function entregaPorToken(token: string) {
  const [entrega] = await db
    .select()
    .from(herramientaEntregas)
    .where(eq(herramientaEntregas.tokenHash, hashDeToken(token)))
    .limit(1)

  if (!entrega) return null
  if (entrega.tokenVence && entrega.tokenVence < new Date()) return { ...entrega, vencida: true as const }
  return { ...entrega, vencida: false as const }
}

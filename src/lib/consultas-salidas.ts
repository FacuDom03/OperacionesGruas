import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, empresas, equipos, personal, salidaPersonal, salidas } from '@/db/schema'

/** Trae todo lo que va en la hoja de una salida, con los nombres ya resueltos. */
export async function datosDeSalida(id: number) {
  const equipoAux = { ...equipos }

  const [fila] = await db
    .select({
      salida: salidas,
      equipo: equipos,
      empresa: empresas,
      cliente: clientes,
    })
    .from(salidas)
    .innerJoin(equipos, eq(salidas.equipoId, equipos.id))
    .innerJoin(empresas, eq(salidas.empresaId, empresas.id))
    .leftJoin(clientes, eq(salidas.clienteId, clientes.id))
    .where(eq(salidas.id, id))
    .limit(1)

  if (!fila) return null

  const cuadrilla = await db
    .select({
      nombre: personal.apellidoNombre,
      legajo: personal.legajo,
      rol: salidaPersonal.rol,
      esSuplente: salidaPersonal.esSuplente,
    })
    .from(salidaPersonal)
    .innerJoin(personal, eq(salidaPersonal.personalId, personal.id))
    .where(eq(salidaPersonal.salidaId, id))

  const nombreDe = async (personalId: number | null) => {
    if (!personalId) return null
    const [p] = await db.select().from(personal).where(eq(personal.id, personalId)).limit(1)
    return p?.apellidoNombre ?? null
  }

  const [verificador, operador, auxiliar] = await Promise.all([
    nombreDe(fila.salida.verificadorId),
    nombreDe(fila.salida.operadorId),
    fila.salida.equipoAuxId
      ? db.select().from(equipoAux).where(eq(equipoAux.id, fila.salida.equipoAuxId)).limit(1).then((r) => r[0]?.interno ?? null)
      : Promise.resolve(null),
  ])

  return { ...fila, cuadrilla, verificador, operador, auxiliar }
}

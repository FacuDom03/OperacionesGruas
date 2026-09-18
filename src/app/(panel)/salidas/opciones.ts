import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { clientes, empresas, equipos, personal } from '@/db/schema'

/** Las listas desplegables del formulario de salida, todas en una consulta cada una. */
export async function opcionesDeSalida() {
  const [listaEquipos, listaEmpresas, listaClientes, listaPersonal] = await Promise.all([
    db.select().from(equipos).where(eq(equipos.activo, true)).orderBy(asc(equipos.interno)),
    db.select().from(empresas).where(eq(empresas.activa, true)).orderBy(asc(empresas.nombreCorto)),
    db.select().from(clientes).where(eq(clientes.activo, true)).orderBy(asc(clientes.razonSocial)),
    db.select().from(personal).where(eq(personal.activo, true)).orderBy(asc(personal.apellidoNombre)),
  ])

  return {
    equipos: listaEquipos.map((e) => ({
      valor: e.id,
      texto: [e.interno, e.marca, e.modelo].filter(Boolean).join(' · '),
    })),
    empresas: listaEmpresas.map((e) => ({ valor: e.id, texto: e.nombreCorto })),
    // Nombres, no ids: el campo de cliente es de texto libre con sugerencias.
    clientes: listaClientes.map((c) => c.razonSocial),
    personal: listaPersonal.map((p) => ({ valor: p.id, texto: p.apellidoNombre })),
    verificadores: listaPersonal.filter((p) => p.esVerificador).map((p) => ({ valor: p.id, texto: p.apellidoNombre })),
    operadores: listaPersonal.filter((p) => p.esOperador).map((p) => ({ valor: p.id, texto: p.apellidoNombre })),
  }
}

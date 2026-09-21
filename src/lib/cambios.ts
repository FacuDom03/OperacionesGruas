/**
 * Traduce una línea de auditoría a algo que se pueda leer sin saber cómo se
 * llaman las columnas. El registro guarda la fila entera antes y después, así
 * que lo primero es quedarse solo con lo que de verdad cambió.
 */

const IGNORADOS = new Set(['id', 'createdAt', 'updatedAt', 'creadoPor'])

const ETIQUETAS: Record<string, string> = {
  activo: 'Activo',
  apellidoNombre: 'Apellido y nombre',
  cargaDireccion: 'Dirección de carga',
  cargaLugarId: 'Lugar de carga',
  cargaObservacion: 'Observación de carga',
  clienteId: 'Cliente',
  cuit: 'CUIT',
  descargaDireccion: 'Dirección de descarga',
  descargaLugarId: 'Lugar de descarga',
  descargaObservacion: 'Observación de descarga',
  destino: 'Destino',
  documento: 'Documento',
  email: 'Correo',
  empresaId: 'Empresa',
  equipoAsignado: 'Equipo asignado',
  equipoAuxId: 'Equipo auxiliar',
  equipoId: 'Equipo',
  estado: 'Estado',
  fecha: 'Fecha',
  horaRegreso: 'Hora de regreso',
  horaSalida: 'Hora de salida',
  interno: 'Interno',
  legajo: 'Legajo',
  lugarId: 'Lugar',
  marca: 'Marca',
  modelo: 'Modelo',
  motivo: 'Motivo',
  nombre: 'Nombre',
  numero: 'Número',
  observaciones: 'Observaciones',
  operadorId: 'Operador',
  ordenDia: 'Orden del día',
  ot: 'OT',
  patente: 'Patente',
  personalId: 'Persona',
  puesto: 'Puesto',
  razonSocial: 'Razón social',
  remito: 'Remito',
  revisado: 'Revisado',
  rol: 'Rol',
  telefono: 'Teléfono',
  tipo: 'Tipo',
  tns: 'Toneladas',
  verificadorId: 'Verificador',
}

export const ETIQUETAS_ENTIDAD: Record<string, string> = {
  checklists: 'Checklist',
  clientes: 'Cliente',
  empresas: 'Empresa',
  equipos: 'Equipo',
  guardias: 'Guardia',
  lugares: 'Lugar',
  personal: 'Persona',
  salidas: 'Salida',
  uso_livianos: 'Uso de liviano',
  usuarios: 'Usuario',
}

export const ETIQUETAS_ACCION: Record<string, string> = {
  alta: 'Alta',
  edicion: 'Edición',
  baja: 'Baja',
  reapertura: 'Reapertura',
}

export function etiquetaDeEntidad(entidad: string): string {
  return ETIQUETAS_ENTIDAD[entidad] ?? entidad
}

export function etiquetaDeAccion(accion: string): string {
  return ETIQUETAS_ACCION[accion] ?? accion
}

/** Nombre del campo. Si no está en la tabla, se separa el camelCase. */
export function etiquetaDeCampo(clave: string): string {
  if (ETIQUETAS[clave]) return ETIQUETAS[clave]
  const separado = clave.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()
  return separado.charAt(0).toUpperCase() + separado.slice(1)
}

/** Un valor suelto del JSON, en texto. */
export function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined || valor === '') return '—'
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'object') return JSON.stringify(valor)
  const texto = String(valor)
  // Los timestamptz vuelven del JSON como ISO; se muestran dd/mm/aaaa HH:mm.
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]} ${iso[4]}:${iso[5]}`
  const fecha = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (fecha) return `${fecha[3]}/${fecha[2]}/${fecha[1]}`
  const hora = texto.match(/^(\d{2}:\d{2}):\d{2}$/)
  if (hora) return hora[1]
  return texto
}

export type Cambio = { campo: string; antes: unknown; despues: unknown }

function objeto(valor: unknown): Record<string, unknown> | null {
  return valor && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null
}

/**
 * Los campos que cambiaron entre las dos versiones. En un alta no hay "antes",
 * así que se listan los campos que quedaron con algún valor; en una baja, al
 * revés.
 */
export function cambios(antes: unknown, despues: unknown): Cambio[] {
  const a = objeto(antes)
  const d = objeto(despues)
  if (!a && !d) return []

  const claves = [...new Set([...Object.keys(a ?? {}), ...Object.keys(d ?? {})])]
    .filter((c) => !IGNORADOS.has(c))

  const lista: Cambio[] = []
  for (const campo of claves) {
    const va = a?.[campo] ?? null
    const vd = d?.[campo] ?? null
    if (a && d && JSON.stringify(va) === JSON.stringify(vd)) continue
    // En un alta o una baja, los campos vacíos no aportan nada.
    if ((!a || !d) && (va ?? vd) === null) continue
    lista.push({ campo, antes: va, despues: vd })
  }
  return lista
}

/** Resumen de una línea para el listado: los primeros campos que cambiaron. */
export function resumenDeCambios(antes: unknown, despues: unknown, cuantos = 3): string {
  const lista = cambios(antes, despues)
  if (lista.length === 0) return ''
  const nombres = lista.slice(0, cuantos).map((c) => etiquetaDeCampo(c.campo))
  const resto = lista.length - nombres.length
  return resto > 0 ? `${nombres.join(', ')} y ${resto} más` : nombres.join(', ')
}

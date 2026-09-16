/**
 * Central Operativa — Gruas Daniele
 * Importación de maestros desde los Excel de operaciones.
 *
 *   npm run import:excel
 *
 * Es IDEMPOTENTE: correrlo dos veces no duplica nada. Usa claves naturales
 * (interno del equipo, documento de la persona, CUIT de la empresa) y actualiza
 * la fila existente en vez de insertar otra.
 *
 * Lo que no se puede mapear con confianza NO se inventa: queda listado en
 * docs/informe-importacion.md con el detalle de qué fila y por qué.
 */
import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import ExcelJS from 'exceljs'
import { eq } from 'drizzle-orm'
import { db } from '../src/db/index.js'
import { empresas, personal, equipos, lugares } from '../src/db/schema.js'

/* ═══════════════════════ configuración ═══════════════════════ */

const RAIZ = resolve(import.meta.dirname, '..')
const ARCHIVO_GD200 = `${RAIZ}/docs/fuentes/GD 200 - Salida Operaciones.xlsx`
const ARCHIVO_GD208 = `${RAIZ}/docs/fuentes/GD 208 - Control de Vehiculos Livianos.xlsx`
const ARCHIVO_INFORME = `${RAIZ}/docs/informe-importacion.md`

/** Valores de relleno de los desplegables del Excel. Nunca son datos reales. */
const PLACEHOLDERS = new Set([
  'GDU000', 'SELECCIONA EQUIPO', 'SELECCIONE EQUIPO', 'SELECCIONE CHOFER',
  'SELECCION ACOMPANANTE', 'SELECCIONE CONTACTOS GD', 'SELECCIONE VERIFICADOR',
  'SELECCION OPERADOR', 'SELECCIONE EMPRESA', 'SELECCION LUGAR',
  'SELECCIONE ESTADO', 'SELECCIONE GESTION', 'SELECCIONE TIPO',
  'SELECIONE TRANSPORTISTA', 'SELECCIONE TRANSPORTISTA',
])

/**
 * Internos que no son una unidad real: son comodines que el Excel usa como
 * opción de desplegable. No se importan al maestro de equipos.
 */
const PSEUDO_UNIDADES = new Set(['GDUVAR', 'GDUXXX'])

/* ═══════════════════════ utilidades ═══════════════════════ */

/** Desenvuelve el valor de una celda: fórmulas, texto enriquecido, hipervínculos. */
function valor(celda: ExcelJS.Cell | undefined): string | number | Date | null {
  const v = celda?.value
  if (v === null || v === undefined) return null
  if (typeof v === 'object') {
    if ('result' in v) return (v.result ?? null) as string | number | null
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('text' in v) return v.text as string
    if (v instanceof Date) return v
    return null
  }
  return v as string | number
}

/** Texto limpio, o null si queda vacío o es un cero de relleno. */
function texto(celda: ExcelJS.Cell | undefined): string | null {
  const v = valor(celda)
  if (v === null) return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  if (s === '' || s === '0' || s === '-') return null
  return s
}

/** Mayúsculas, sin acentos, sin espacios de más. Para comparar, no para guardar. */
function norm(s: unknown): string {
  if (s === null || s === undefined) return ''
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/\s+/g, ' ').trim()
}

function esPlaceholder(s: unknown): boolean {
  return PLACEHOLDERS.has(norm(s))
}

/** Solo dígitos. Para CUIT y documento. */
function soloDigitos(s: unknown): string | null {
  const d = String(s ?? '').replace(/\D/g, '')
  return d === '' ? null : d
}

/** CUIT formateado 99-99999999-9, o null si no tiene 11 dígitos. */
function cuit(s: unknown): string | null {
  const d = soloDigitos(s)
  if (!d || d.length !== 11) return null
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`
}

/** Distancia de edición, para detectar los errores de tipeo entre los dos libros. */
function distancia(a: string, b: string): number {
  const m = a.length, n = b.length
  if (Math.abs(m - n) > 3) return 99
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const fila = [i]
    for (let j = 1; j <= n; j++) {
      fila[j] = Math.min(
        prev[j] + 1,
        fila[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = fila
  }
  return prev[n]
}

/* ═══════════════════════ informe ═══════════════════════ */

type Aviso = { origen: string; detalle: string }
const informe = new Map<string, Aviso[]>()

function avisar(categoria: string, origen: string, detalle: string) {
  if (!informe.has(categoria)) informe.set(categoria, [])
  informe.get(categoria)!.push({ origen, detalle })
}

/* ═══════════════════════ empresas ═══════════════════════ */

async function importarEmpresas(gd200: ExcelJS.Workbook, gd208: ExcelJS.Workbook) {
  type Fila = { codigo: string; razonSocial: string; nombreCorto: string; cuit: string | null }
  const filas: Fila[] = []

  // GD 200 es la lista canónica: filas 2 a 9. Más abajo la hoja tiene
  // los catálogos de Estado y Gestión, que no son empresas.
  const h200 = gd200.getWorksheet('Empresas')!
  for (let r = 2; r <= 9; r++) {
    const codigo = texto(h200.getCell(r, 1))
    const razonSocial = texto(h200.getCell(r, 2))
    const nombreCorto = texto(h200.getCell(r, 3))
    if (!codigo || !razonSocial || esPlaceholder(nombreCorto)) continue
    filas.push({
      codigo,
      razonSocial,
      nombreCorto: nombreCorto ?? razonSocial,
      cuit: cuit(texto(h200.getCell(r, 4))),
    })
  }

  // GD 208 usa otros nombres para las mismas empresas. Se unifica por CUIT:
  // si el CUIT ya está, se ignora; si es nuevo, se agrega.
  const cuitsConocidos = new Set(filas.map((f) => f.cuit).filter(Boolean))
  const h208 = gd208.getWorksheet('Empresas')!
  for (let r = 2; r <= 13; r++) {
    const codigo = texto(h208.getCell(r, 1))
    const razonSocial = texto(h208.getCell(r, 2))
    const c = cuit(texto(h208.getCell(r, 4)))
    if (!codigo || !razonSocial || esPlaceholder(razonSocial)) continue
    if (c && cuitsConocidos.has(c)) continue
    if (!c) {
      avisar('Empresas sin CUIT que no se pudieron unificar',
        `GD 208 · hoja Empresas · fila ${r}`,
        `"${razonSocial}" (${codigo}) no tiene CUIT, así que no se puede saber si es una de las 8 empresas de GD 200 o una distinta. No se importó.`)
      continue
    }
    filas.push({ codigo, razonSocial, nombreCorto: texto(h208.getCell(r, 3)) ?? razonSocial, cuit: c })
    cuitsConocidos.add(c)
    avisar('Empresas que solo están en un libro',
      `GD 208 · hoja Empresas · fila ${r}`,
      `"${razonSocial}" (CUIT ${c}) está en GD 208 pero no en GD 200. Se importó igual; confirmar si opera.`)
  }

  const sinCuit = filas.filter((f) => !f.cuit)
  for (const f of sinCuit) {
    avisar('Empresas sin CUIT',
      'GD 200 · hoja Empresas',
      `"${f.nombreCorto}" (${f.codigo}) no tiene CUIT cargado. Hay que completarlo antes de facturar.`)
  }

  // Escritura idempotente: busca por CUIT, y si no hay CUIT, por código.
  const existentes = await db.select().from(empresas)
  let nuevas = 0, actualizadas = 0
  for (const f of filas) {
    const previa = existentes.find((e) =>
      (f.cuit && e.cuit === f.cuit) || (!f.cuit && e.codigo === f.codigo))
    if (previa) {
      await db.update(empresas)
        .set({ codigo: f.codigo, razonSocial: f.razonSocial, nombreCorto: f.nombreCorto, cuit: f.cuit })
        .where(eq(empresas.id, previa.id))
      actualizadas++
    } else {
      await db.insert(empresas).values(f)
      nuevas++
    }
  }
  return { total: filas.length, nuevas, actualizadas }
}

/* ═══════════════════════ lugares ═══════════════════════ */

async function importarLugares(gd208: ExcelJS.Workbook) {
  const hoja = gd208.getWorksheet('Empresas')!
  const filas: { codigo: string; nombre: string }[] = []
  // Los lugares viven al final de la hoja Empresas de GD 208, filas 28 a 35.
  for (let r = 28; r <= 35; r++) {
    const codigo = texto(hoja.getCell(r, 1))
    const nombre = texto(hoja.getCell(r, 3))
    if (!codigo || !nombre || esPlaceholder(nombre)) continue
    filas.push({ codigo, nombre })
  }

  const existentes = await db.select().from(lugares)
  let nuevos = 0, actualizados = 0
  for (const f of filas) {
    const previo = existentes.find((l) => l.codigo === f.codigo)
    if (previo) {
      await db.update(lugares).set({ nombre: f.nombre }).where(eq(lugares.id, previo.id))
      actualizados++
    } else {
      await db.insert(lugares).values(f)
      nuevos++
    }
  }
  return { total: filas.length, nuevos, actualizados }
}

/* ═══════════════════════ personal ═══════════════════════ */

type FilaPersona = {
  apellidoNombre: string
  legajo: string | null
  documento: string | null
  empresaNombre: string | null
  puesto: string | null
  origen: string
}

/**
 * Los dos libros escriben los nombres distinto: GD 208 los acorta
 * ("Cano Aldo Ruben" por "Cano Silvero Aldo Ruben"), los reordena
 * ("Daniele Nicolas Marvin" por "Nicolas Daniele") y tiene errores de tipeo
 * ("De Felippe" por "De Felipe"). Esto empareja lo mismo sin inventar:
 * si hay más de un candidato posible devuelve 'ambiguo' y no se toca nada.
 */
function buscarNombre(nombre: string, candidatos: string[]): string | null | 'ambiguo' {
  const n = norm(nombre)
  if (candidatos.includes(n)) return n

  const tokens = new Set(n.split(' '))
  const porSubconjunto = candidatos.filter((c) => {
    const tc = new Set(c.split(' '))
    const chico = tokens.size <= tc.size ? tokens : tc
    const grande = tokens.size <= tc.size ? tc : tokens
    return [...chico].every((t) => grande.has(t))
  })
  if (porSubconjunto.length === 1) return porSubconjunto[0]
  if (porSubconjunto.length > 1) return 'ambiguo'

  const partes = n.split(' ')

  // Misma cantidad de palabras y una sola letra de diferencia en total:
  // "Transportes Daniele" contra "Transporte Daniele".
  const porLetra = candidatos.filter((c) => {
    const pc = c.split(' ')
    if (pc.length !== partes.length) return false
    const total = partes.reduce((acc, t, i) => acc + distancia(t, pc[i]), 0)
    return total > 0 && total <= 1
  })
  if (porLetra.length === 1) return porLetra[0]
  if (porLetra.length > 1) return 'ambiguo'

  // Mismo apellido y mismo primer nombre, con un token mal tipeado.
  const porTipeo = candidatos.filter((c) => {
    const pc = c.split(' ')
    if (pc[0] !== partes[0]) return false
    const comunes = partes.filter((t) => pc.includes(t)).length
    if (comunes < 2) return false
    return partes.some((t) => pc.some((u) => u !== t && distancia(t, u) === 1))
  })
  if (porTipeo.length === 1) return porTipeo[0]
  if (porTipeo.length > 1) return 'ambiguo'
  return null
}

async function importarPersonal(gd200: ExcelJS.Workbook, gd208: ExcelJS.Workbook) {
  const filas: FilaPersona[] = []

  // GD 200 es la fuente principal: trae legajo, documento y puesto.
  const h200 = gd200.getWorksheet('Personal')!
  for (let r = 2; r <= h200.rowCount; r++) {
    const nombre = texto(h200.getCell(r, 2))
    if (!nombre || esPlaceholder(nombre)) continue
    filas.push({
      apellidoNombre: nombre,
      legajo: texto(h200.getCell(r, 3)),
      documento: soloDigitos(texto(h200.getCell(r, 6))),
      empresaNombre: texto(h200.getCell(r, 4)),
      puesto: texto(h200.getCell(r, 5)),
      origen: `GD 200 · hoja Personal · fila ${r}`,
    })
  }

  // Legajos repetidos: son datos reales del Excel, no un error de lectura.
  const porLegajo = new Map<string, FilaPersona[]>()
  for (const f of filas) {
    if (!f.legajo) continue
    if (!porLegajo.has(f.legajo)) porLegajo.set(f.legajo, [])
    porLegajo.get(f.legajo)!.push(f)
  }
  for (const [legajo, grupo] of porLegajo) {
    if (grupo.length > 1) {
      avisar('Legajos repetidos', 'GD 200 · hoja Personal',
        `El legajo ${legajo} figura en ${grupo.length} personas: ${grupo.map((g) => g.apellidoNombre).join(' / ')}. Se importaron las dos; hay que corregir uno.`)
    }
  }

  for (const f of filas) {
    if (!f.documento) {
      avisar('Personal sin documento', f.origen,
        `"${f.apellidoNombre}" no tiene número de documento. Se importó, pero el documento es la clave que evita duplicados.`)
    }
  }

  // GD 208 tiene gente que no está en GD 200. Se agrega la que no empareja.
  const nombresGD200 = filas.map((f) => norm(f.apellidoNombre))
  const h208 = gd208.getWorksheet('Personal')!   // ojo: sin fila de encabezado
  for (let r = 1; r <= h208.rowCount; r++) {
    const nombre = texto(h208.getCell(r, 2))
    if (!nombre || esPlaceholder(nombre)) continue
    const match = buscarNombre(nombre, nombresGD200)
    if (match === 'ambiguo') {
      avisar('Personas que no se pudieron emparejar', `GD 208 · hoja Personal · fila ${r}`,
        `"${nombre}" se parece a más de una persona de GD 200. No se importó para no duplicar. Decidir a mano.`)
      continue
    }
    if (match) continue   // ya está, escrito distinto
    filas.push({
      apellidoNombre: nombre,
      legajo: texto(h208.getCell(r, 4)),
      documento: null,
      empresaNombre: texto(h208.getCell(r, 3)),
      puesto: null,
      origen: `GD 208 · hoja Personal · fila ${r}`,
    })
    nombresGD200.push(norm(nombre))
    avisar('Personas que solo están en GD 208', `GD 208 · hoja Personal · fila ${r}`,
      `"${nombre}" no figura en el maestro de GD 200. Se importó sin documento ni puesto; hay que completarlos.`)
  }

  // Verificadores y operadores: son marcas sobre el mismo maestro.
  const roles = new Map<string, { verificador: boolean; operador: boolean }>()
  for (const [hojaNombre, campo] of [['Verificador', 'verificador'], ['Operador', 'operador']] as const) {
    const hoja = gd200.getWorksheet(hojaNombre)!
    for (let r = 2; r <= hoja.rowCount; r++) {
      const nombre = texto(hoja.getCell(r, 4))
      if (!nombre || esPlaceholder(nombre)) continue
      const match = buscarNombre(nombre, filas.map((f) => norm(f.apellidoNombre)))
      if (!match || match === 'ambiguo') {
        avisar('Verificadores y operadores sin persona', `GD 200 · hoja ${hojaNombre} · fila ${r}`,
          `"${nombre}" figura como ${campo} pero no está en el maestro de Personal. No se marcó.`)
        continue
      }
      const actual = roles.get(match) ?? { verificador: false, operador: false }
      actual[campo] = true
      roles.set(match, actual)
    }
  }

  // Escritura idempotente: por documento si lo tiene, si no por nombre normalizado.
  /*
   * Los dos libros nombran a la misma empresa distinto: "Transportes Daniele"
   * contra "Transporte Daniele", o "Daniele Nicolas Marvin" contra
   * "Nicolas Daniele". Se empareja con el mismo criterio que las personas.
   */
  const listaEmpresas = await db.select().from(empresas)
  const alias = new Map<string, number>()
  for (const e of listaEmpresas) {
    alias.set(norm(e.nombreCorto), e.id)
    alias.set(norm(e.razonSocial), e.id)
  }
  const buscarEmpresa = (nombre: string | null) => {
    if (!nombre) return null
    const n = norm(nombre)
    if (alias.has(n)) return alias.get(n)!
    const match = buscarNombre(n, [...alias.keys()])
    if (!match || match === 'ambiguo') return null
    return alias.get(match)!
  }

  const existentes = await db.select().from(personal)
  let nuevas = 0, actualizadas = 0
  for (const f of filas) {
    const n = norm(f.apellidoNombre)
    const rol = roles.get(n) ?? { verificador: false, operador: false }
    const empresaId = buscarEmpresa(f.empresaNombre)
    if (f.empresaNombre && !empresaId) {
      avisar('Personal con empresa desconocida', f.origen,
        `"${f.apellidoNombre}" figura en la empresa "${f.empresaNombre}", que no está en el maestro de Empresas. Se importó sin empresa.`)
    }
    const datos = {
      apellidoNombre: f.apellidoNombre,
      legajo: f.legajo,
      documento: f.documento,
      empresaId,
      puesto: f.puesto,
      esChofer: /CHOFER|GUINCHERO|OPERADOR DE GRUA/.test(norm(f.puesto)),
      esVerificador: rol.verificador,
      esOperador: rol.operador,
    }
    const previa = existentes.find((p) =>
      (f.documento && p.documento === f.documento) ||
      (!f.documento && norm(p.apellidoNombre) === n))
    if (previa) {
      await db.update(personal).set(datos).where(eq(personal.id, previa.id))
      actualizadas++
    } else {
      await db.insert(personal).values(datos)
      nuevas++
    }
  }
  return { total: filas.length, nuevas, actualizadas }
}

/* ═══════════════════════ equipos ═══════════════════════ */

async function importarEquipos(gd200: ExcelJS.Workbook, gd208: ExcelJS.Workbook) {
  type FilaEquipo = {
    interno: string; nroViejo: string | null; tipo: string
    tns: string | null; marca: string | null; modelo: string | null
    patente: string | null; equipoAsignado: string | null; origen: string
  }
  const filas: FilaEquipo[] = []
  const vistos = new Set<string>()

  const h200 = gd200.getWorksheet('Equipos')!
  for (let r = 2; r <= h200.rowCount; r++) {
    const crudo = texto(h200.getCell(r, 2))
    if (!crudo || esPlaceholder(crudo)) continue

    // Corrección: la fila del Iveco DS-240 tiene el interno "111", sin el prefijo.
    let interno = norm(crudo)
    if (/^\d{3}$/.test(interno)) {
      interno = `GDU${interno}`
      avisar('Internos corregidos', `GD 200 · hoja Equipos · fila ${r}`,
        `El interno venía como "${crudo}", sin el prefijo. Se importó como ${interno}.`)
    }

    if (PSEUDO_UNIDADES.has(interno)) {
      avisar('Comodines que no son unidades reales', `GD 200 · hoja Equipos · fila ${r}`,
        `"${crudo}" (${texto(h200.getCell(r, 5)) ?? 'sin tipo'}) es un comodín del desplegable, no una unidad. No se importó. Si operaciones lo usa para registrar movimientos, hay que resolverlo de otra forma en la app.`)
      continue
    }

    // Las filas que no tienen forma de interno son catálogos de las hojas de
    // transporte tercerizado metidos en la misma hoja. No son equipos.
    if (!/^GDU\d{3}$/.test(interno)) {
      avisar('Filas de la hoja Equipos que no son equipos', `GD 200 · hoja Equipos · fila ${r}`,
        `"${crudo}" no tiene forma de interno (GDU + 3 dígitos). Es un valor de desplegable de las hojas de transporte tercerizado. No se importó.`)
      continue
    }

    if (vistos.has(interno)) {
      const primera = filas.find((f) => f.interno === interno)
      avisar('Internos duplicados', `GD 200 · hoja Equipos · fila ${r}`,
        `${interno} ya figura en la ${primera?.origen ?? 'fila anterior'}, con las columnas bien puestas. Las filas 100 a 104 son una copia del bloque de carretones y semirremolques con las columnas corridas. Se conservó la primera.`)
      continue
    }
    vistos.add(interno)

    /*
     * Algunas filas —los carretones y semirremolques— tienen las columnas
     * corridas un lugar a la izquierda a partir de "Equipo Asignado":
     * el tipo quedó en la columna de equipo asignado, la marca en la de tipo,
     * el modelo en la de TNs y la patente en la de marca.
     * Se detecta porque TNs, que es numérica, trae texto.
     */
    const tns = valor(h200.getCell(r, 6))
    const corrida = tns !== null && typeof tns !== 'number' && isNaN(Number(tns))

    let tipoCrudo: string | null, marca: string | null, modelo: string | null
    let patente: string | null, tnsValor: string | null, equipoAsignado: string | null

    if (corrida) {
      tipoCrudo = texto(h200.getCell(r, 4))
      marca = texto(h200.getCell(r, 5))
      modelo = texto(h200.getCell(r, 6))
      patente = texto(h200.getCell(r, 7))
      tnsValor = null
      equipoAsignado = null
      avisar('Filas con las columnas corridas', `GD 200 · hoja Equipos · fila ${r}`,
        `${interno} tenía las columnas desplazadas un lugar: la marca ("${marca}") estaba en la columna Tipo y la patente en la columna Marca. Se reacomodó al importar, pero conviene arreglarlo en el Excel si se lo sigue usando.`)
    } else {
      tipoCrudo = texto(h200.getCell(r, 5))
      tnsValor = texto(h200.getCell(r, 6))
      marca = texto(h200.getCell(r, 7))
      modelo = texto(h200.getCell(r, 8))
      patente = texto(h200.getCell(r, 9))
      equipoAsignado = texto(h200.getCell(r, 4))
    }

    if (!tipoCrudo) {
      avisar('Equipos sin tipo', `GD 200 · hoja Equipos · fila ${r}`,
        `${interno} no tiene tipo cargado. Se importó como "Sin clasificar".`)
    }

    filas.push({
      interno,
      nroViejo: texto(h200.getCell(r, 3)),
      tipo: tipoCrudo ?? 'Sin clasificar',
      tns: tnsValor,
      marca,
      modelo,
      patente,
      equipoAsignado: esPlaceholder(equipoAsignado) ? null : equipoAsignado,
      origen: `GD 200 · hoja Equipos · fila ${r}`,
    })
  }

  // GD 208 tiene unidades livianas que no están en el maestro de GD 200.
  const h208 = gd208.getWorksheet('Unidades')!
  for (let r = 4; r <= h208.rowCount; r++) {
    const crudo = texto(h208.getCell(r, 2))
    if (!crudo || esPlaceholder(crudo)) continue
    const interno = norm(crudo)
    if (!/^GDU\d{3}$/.test(interno)) continue
    if (vistos.has(interno)) continue
    vistos.add(interno)
    filas.push({
      interno,
      nroViejo: null,
      tipo: texto(h208.getCell(r, 3)) ?? 'Liviano',
      tns: null,
      marca: texto(h208.getCell(r, 4)),
      modelo: texto(h208.getCell(r, 5)),
      patente: texto(h208.getCell(r, 6)),
      equipoAsignado: null,
      origen: `GD 208 · hoja Unidades · fila ${r}`,
    })
    avisar('Equipos que solo están en GD 208', `GD 208 · hoja Unidades · fila ${r}`,
      `${interno} (${texto(h208.getCell(r, 4)) ?? '?'} ${texto(h208.getCell(r, 5)) ?? ''}) no está en el maestro de GD 200. Se importó.`)
  }

  // Patentes repetidas: casi siempre son la misma unidad cargada dos veces.
  const porPatente = new Map<string, FilaEquipo[]>()
  for (const f of filas) {
    if (!f.patente) continue
    const k = norm(f.patente).replace(/\s/g, '')
    if (!porPatente.has(k)) porPatente.set(k, [])
    porPatente.get(k)!.push(f)
  }
  for (const [patente, grupo] of porPatente) {
    if (grupo.length > 1) {
      avisar('Patentes repetidas', 'Maestro de equipos',
        `La patente ${patente} figura en ${grupo.length} internos: ${grupo.map((g) => g.interno).join(', ')}. Revisar cuál corresponde.`)
    }
  }

  const sinPatente = filas.filter((f) => !f.patente && !/^GDU[45]/.test(f.interno))
  if (sinPatente.length) {
    avisar('Equipos sin patente', 'Maestro de equipos',
      `${sinPatente.length} equipos no tienen patente: ${sinPatente.map((f) => f.interno).join(', ')}. En autoelevadores y manipuladores es normal.`)
  }

  const existentes = await db.select().from(equipos)
  let nuevos = 0, actualizados = 0
  for (const f of filas) {
    const { origen, ...datos } = f
    const previo = existentes.find((e) => e.interno === f.interno)
    if (previo) {
      await db.update(equipos).set(datos).where(eq(equipos.id, previo.id))
      actualizados++
    } else {
      await db.insert(equipos).values(datos)
      nuevos++
    }
  }
  return { total: filas.length, nuevos, actualizados }
}

/* ═══════════════════════ informe en disco ═══════════════════════ */

function escribirInforme(resumen: Record<string, unknown>) {
  const lineas: string[] = [
    '# Informe de importación',
    '',
    `Generado el ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}.`,
    '',
    '## Filas cargadas',
    '',
    '| Tabla | Total | Nuevas | Actualizadas |',
    '|---|---|---|---|',
  ]
  for (const [tabla, r] of Object.entries(resumen)) {
    const x = r as Record<string, number>
    lineas.push(`| ${tabla} | ${x.total} | ${x.nuevas ?? x.nuevos} | ${x.actualizadas ?? x.actualizados} |`)
  }
  lineas.push('', '## Lo que hay que revisar a mano', '')
  if (informe.size === 0) {
    lineas.push('Nada. Los dos archivos se leyeron completos sin ambigüedades.')
  }
  for (const [categoria, avisos] of informe) {
    lineas.push(`### ${categoria} (${avisos.length})`, '')
    for (const a of avisos) lineas.push(`- **${a.origen}** — ${a.detalle}`)
    lineas.push('')
  }
  mkdirSync(dirname(ARCHIVO_INFORME), { recursive: true })
  writeFileSync(ARCHIVO_INFORME, lineas.join('\n'), 'utf8')
}

/* ═══════════════════════ main ═══════════════════════ */

async function main() {
  const gd200 = new ExcelJS.Workbook()
  await gd200.xlsx.readFile(ARCHIVO_GD200)
  const gd208 = new ExcelJS.Workbook()
  await gd208.xlsx.readFile(ARCHIVO_GD208)

  const resumen = {
    empresas: await importarEmpresas(gd200, gd208),
    lugares: await importarLugares(gd208),
    personal: await importarPersonal(gd200, gd208),
    equipos: await importarEquipos(gd200, gd208),
  }

  escribirInforme(resumen)

  console.log('\n  FILAS CARGADAS')
  console.log('  ─────────────────────────────────────────────')
  for (const [tabla, r] of Object.entries(resumen)) {
    const x = r as Record<string, number>
    console.log(`  ${tabla.padEnd(12)} ${String(x.total).padStart(4)} filas` +
      `   (${x.nuevas ?? x.nuevos} nuevas, ${x.actualizadas ?? x.actualizados} actualizadas)`)
  }
  const totalAvisos = [...informe.values()].reduce((a, b) => a + b.length, 0)
  console.log('  ─────────────────────────────────────────────')
  console.log(`\n  ${totalAvisos} cosas para revisar a mano, en ${informe.size} categorías:\n`)
  for (const [categoria, avisos] of informe) {
    console.log(`    ${String(avisos.length).padStart(3)}  ${categoria}`)
  }
  console.log(`\n  El detalle está en docs/informe-importacion.md\n`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })

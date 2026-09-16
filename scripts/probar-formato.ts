/**
 * Central Operativa — Gruas Daniele
 * Comprobaciones de las normalizaciones de src/lib/formato.ts.
 *
 *   npm test
 *
 * Son las reglas de CLAUDE.md que, si se rompen, no se notan hasta que el
 * WhatsApp no llega o un interno queda duplicado.
 */
import { normalizarCuit, normalizarInterno, normalizarTelefono } from '../src/lib/formato.js'

let fallas = 0

function comparar(que: string, dio: unknown, esperaba: unknown) {
  const bien = dio === esperaba
  if (!bien) fallas++
  console.log(`  ${bien ? 'ok  ' : 'FALLA'} ${que} -> ${dio}${bien ? '' : ` (esperaba ${esperaba})`}`)
}

console.log('\n  Telefonos (Cloud API: 54 + area + numero, sin el 9 ni el 15)\n')
const telefonos: [string, string | null][] = [
  ['+54 9 11 5578-2210', '541155782210'],  // el formato viejo de Baileys
  ['5491155782210', '541155782210'],
  ['541155782210', '541155782210'],        // ya normalizado
  ['11 5578-2210', '541155782210'],
  ['221 456-7890', '542214567890'],        // area de 3 digitos
  ['011 15 5578 2210', null],              // el 15 deja un digito de mas
  ['15-5578-2210', null],                  // 15 local, sin area: no se adivina
  ['0221 15 456-7890', null],
  ['', null],
  ['no es un telefono', null],
]
for (const [entrada, esperado] of telefonos) comparar(`"${entrada}"`, normalizarTelefono(entrada), esperado)

console.log('\n  Internos (GDU + tres digitos)\n')
const internos: [string, string][] = [
  ['111', 'GDU111'],        // la fila del Excel sin prefijo
  ['gdu505', 'GDU505'],
  ['GDU 061', 'GDU061'],
  ['5', 'GDU005'],
]
for (const [entrada, esperado] of internos) comparar(`"${entrada}"`, normalizarInterno(entrada), esperado)

console.log('\n  CUIT\n')
comparar('"30707558500"', normalizarCuit('30707558500'), '30-70755850-0')
comparar('"30-70755850-0"', normalizarCuit('30-70755850-0'), '30-70755850-0')
comparar('"a medio cargar"', normalizarCuit('307075'), '307075')
comparar('vacio', normalizarCuit(''), null)

console.log(fallas === 0 ? '\n  todo bien\n' : `\n  ${fallas} fallas\n`)
process.exit(fallas === 0 ? 0 : 1)

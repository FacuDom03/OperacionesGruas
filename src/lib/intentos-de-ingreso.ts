/**
 * Freno a la fuerza bruta en la pantalla de ingreso.
 *
 * La app esta en un dominio publico y entra con correo y contraseña: sin esto,
 * nada impide probar diez mil claves. Se cuentan los fallos por correo y se
 * bloquea un rato cuando se pasan.
 *
 * El registro es en memoria, como el de los tokens de impresion: alcanza para
 * una sola instancia, que es como corre hoy. Si algun dia corren varias, esto
 * tiene que pasar a la base o a un Redis, porque cada una contaria por su lado.
 *
 * Reiniciar el servidor limpia la cuenta. No es un problema: quien ataca no
 * puede reiniciarlo.
 */

const MAXIMO_FALLOS = 5
const VENTANA_MS = 15 * 60 * 1000

type Registro = { fallos: number; hasta: number }

const porCorreo = new Map<string, Registro>()

/** Saca los que ya vencieron, asi el mapa no crece para siempre. */
function limpiar(ahora: number) {
  for (const [clave, registro] of porCorreo) {
    if (registro.hasta < ahora) porCorreo.delete(clave)
  }
}

/** true si ese correo esta bloqueado en este momento. */
export function estaBloqueado(correo: string): boolean {
  const ahora = Date.now()
  limpiar(ahora)
  const registro = porCorreo.get(correo)
  return Boolean(registro && registro.fallos >= MAXIMO_FALLOS && registro.hasta > ahora)
}

export function registrarFallo(correo: string): void {
  const ahora = Date.now()
  limpiar(ahora)

  const registro = porCorreo.get(correo)
  // La ventana se corre con cada fallo: cinco intentos seguidos bloquean,
  // aunque el primero haya sido hace catorce minutos.
  porCorreo.set(correo, {
    fallos: (registro?.hasta ?? 0) > ahora ? (registro?.fallos ?? 0) + 1 : 1,
    hasta: ahora + VENTANA_MS,
  })
}

export function limpiarFallos(correo: string): void {
  porCorreo.delete(correo)
}

/** Para las pruebas: deja la cuenta en cero. */
export function reiniciarIntentos(): void {
  porCorreo.clear()
}

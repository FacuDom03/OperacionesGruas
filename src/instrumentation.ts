/**
 * Se ejecuta una sola vez cuando arranca el servidor, antes de atender pedidos.
 *
 * El cuerpo real vive en instrumentation-node.ts y se importa solo cuando el
 * runtime es Node. Con el middleware activo, Next tambien compila este archivo
 * para el edge, donde no existen ni 'net' ni 'tls' y el driver de Postgres no
 * puede ni cargarse. Al preguntar por NEXT_RUNTIME dentro del if, el import
 * queda fuera del paquete del edge.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node')
  }
}

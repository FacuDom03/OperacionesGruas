import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// El middleware corre en el edge, donde no hay conexion a la base. Por eso usa
// la configuracion sin proveedores: solo valida el token, no consulta usuarios.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  // Todo menos los archivos estaticos.
  //
  // Las tipografias de /fuentes tienen que quedar afuera si o si: si el
  // middleware las intercepta, el pedido del .woff2 se va a /ingresar con un
  // 307 y la hoja termina con la tipografia que el navegador tenga a mano.
  // En pantalla casi no se nota; en el PDF, si.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|fuentes/|.*\\.(?:png|svg|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)',
  ],
}

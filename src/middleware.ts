import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// El middleware corre en el edge, donde no hay conexion a la base. Por eso usa
// la configuracion sin proveedores: solo valida el token, no consulta usuarios.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  // Todo menos los archivos estaticos y el favicon.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
}

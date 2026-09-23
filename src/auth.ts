import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { and, eq } from 'drizzle-orm'
import { authConfig } from '@/auth.config'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { estaBloqueado, limpiarFallos, registrarFallo } from '@/lib/intentos-de-ingreso'
import { hashDeDescarte, verificarPassword } from '@/lib/password'

/**
 * Auth.js no mira el mensaje del error: lo que llega a la pantalla es la
 * propiedad `code`. Por eso hace falta una subclase y no alcanza con
 * `new CredentialsSignin('demasiados')`.
 */
class DemasiadosIntentos extends CredentialsSignin {
  code = 'demasiados'
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credenciales) {
        const email = String(credenciales?.email ?? '').trim().toLowerCase()
        const password = String(credenciales?.password ?? '')
        if (!email || !password) return null

        // Cinco fallos seguidos y el correo queda bloqueado un rato. Se mira
        // antes de tocar la base, para que el bloqueo tambien sirva de freno.
        if (estaBloqueado(email)) throw new DemasiadosIntentos()

        const [usuario] = await db
          .select()
          .from(usuarios)
          .where(and(eq(usuarios.email, email), eq(usuarios.activo, true)))
          .limit(1)

        // Mismo resultado y **mismo tiempo** si el usuario no existe o si la
        // clave esta mal. Sin el hash de descarte, un correo inexistente
        // contesta al toque y uno real tarda lo que tarda scrypt: esa
        // diferencia deja averiguar quien esta dado de alta.
        if (!usuario) {
          await hashDeDescarte(password)
          registrarFallo(email)
          return null
        }

        if (!(await verificarPassword(password, usuario.passwordHash))) {
          registrarFallo(email)
          return null
        }

        limpiarFallos(email)

        return {
          id: String(usuario.id),
          email: usuario.email,
          rol: usuario.rol,
        }
      },
    }),
  ],
})

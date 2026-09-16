import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { and, eq } from 'drizzle-orm'
import { authConfig } from '@/auth.config'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { verificarPassword } from '@/lib/password'

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

        const [usuario] = await db
          .select()
          .from(usuarios)
          .where(and(eq(usuarios.email, email), eq(usuarios.activo, true)))
          .limit(1)

        // Mismo resultado si el usuario no existe o si la clave esta mal: no
        // conviene dejar averiguar que correos estan dados de alta.
        if (!usuario) return null
        if (!(await verificarPassword(password, usuario.passwordHash))) return null

        return {
          id: String(usuario.id),
          email: usuario.email,
          rol: usuario.rol,
        }
      },
    }),
  ],
})

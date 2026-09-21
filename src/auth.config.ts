import type { NextAuthConfig } from 'next-auth'

/** Los cuatro roles del capitulo 10 del spec. */
export type Rol = 'admin' | 'operaciones' | 'mantenimiento' | 'consulta'

/**
 * Rutas que se sirven sin sesion:
 *  - la pantalla de ingreso,
 *  - los endpoints de Auth.js, que son los que dan la sesion: si pidieran
 *    sesion no se podria entrar nunca,
 *  - el chequeo de estado que usa el HEALTHCHECK de Docker,
 *  - los dos endpoints que consume n8n, que se autentican por x-api-key.
 */
const PUBLICAS = [
  '/ingresar', '/api/auth', '/api/health', '/api/checklists', '/api/envios',
  // /print se fija por su cuenta: acepta sesion o el token de un solo uso que
  // usa Puppeteer. No se puede resolver aca porque el middleware corre en el
  // edge y la firma del token se verifica del lado de Node.
  '/print',
  // El formulario donde el empleado confirma que recibio una herramienta. No
  // tiene sesion: la credencial es el token del link, y se valida del lado de
  // Node contra el hash que quedo en la base.
  '/confirmar',
]

/**
 * Configuracion compartida entre el middleware (que corre en el edge y no puede
 * abrir la base) y la configuracion completa de src/auth.ts. Por eso aca no hay
 * ningun proveedor: los proveedores se agregan del lado del servidor.
 */
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/ingresar' },
  providers: [],
  callbacks: {
    /** Decide si el pedido sigue. Lo usa el middleware en cada navegacion. */
    authorized({ auth, request }) {
      const ruta = request.nextUrl.pathname
      if (PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))) return true
      return Boolean(auth?.user)
    },

    /** Al entrar, guarda id y rol en el token para no consultar la base cada vez. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = user.rol
      }
      return token
    },

    /** Expone id y rol en la sesion que leen las pantallas y las acciones. */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.rol = token.rol as Rol
      }
      return session
    },
  },
} satisfies NextAuthConfig

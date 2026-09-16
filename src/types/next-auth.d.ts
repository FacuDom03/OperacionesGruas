import type { Rol } from '@/auth.config'

declare module 'next-auth' {
  interface User {
    rol: Rol
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      rol: Rol
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    rol: Rol
  }
}

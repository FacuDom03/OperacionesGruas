import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { auth, signIn } from '@/auth'

export const dynamic = 'force-dynamic'

export default async function Ingresar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const sesion = await auth()
  if (sesion?.user) redirect('/')

  const { error } = await searchParams

  async function entrar(datos: FormData) {
    'use server'

    try {
      await signIn('credentials', {
        email: datos.get('email'),
        password: datos.get('password'),
        redirectTo: '/',
      })
    } catch (e) {
      // signIn lanza un redirect cuando sale bien: ese hay que dejarlo pasar.
      if (e instanceof AuthError) redirect('/ingresar?error=1')
      throw e
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-semibold tracking-tight">Central Operativa</h1>
        <p className="mt-1 text-sm text-[var(--color-tenue)]">Gruas Daniele</p>

        <form action={entrar} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Correo</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
            />
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              Correo o contraseña incorrectos.
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-md bg-[var(--color-acento)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  )
}

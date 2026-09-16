import { FormularioSalida } from '../formulario'
import { opcionesDeSalida } from '../opciones'
import { Titulo } from '@/components/ui'
import { hoy } from '@/lib/formato'
import { permisoRequerido } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function NuevaSalida({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>
}) {
  await permisoRequerido('editar_salidas')

  const { fecha } = await searchParams
  const opciones = await opcionesDeSalida()

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <Titulo>Nueva salida de trabajo</Titulo>
      <FormularioSalida salida={null} cuadrillaInicial={[]} hoy={fecha ?? hoy()} {...opciones} />
    </main>
  )
}

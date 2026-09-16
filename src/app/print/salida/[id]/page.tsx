import { notFound } from 'next/navigation'
import { HojaDeSalida } from '@/components/hoja-salida'
import { datosDeSalida } from '@/lib/consultas-salidas'
import { accesoDeImpresion } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function ImprimirSalida({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token } = await searchParams

  await accesoDeImpresion(`/print/salida/${id}`, token)

  const datos = await datosDeSalida(Number(id))
  if (!datos) notFound()

  return <HojaDeSalida {...datos} />
}

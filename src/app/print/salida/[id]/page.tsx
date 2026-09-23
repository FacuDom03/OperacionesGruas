import { notFound } from 'next/navigation'
import { ErrorDeHoja, motivoDe } from '@/components/error-de-hoja'
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

  let datos
  try {
    datos = await datosDeSalida(Number(id))
  } catch (error) {
    // Se renderiza el motivo en vez de tirar: asi el que pide el PDF se entera
    // de que paso, y no de que "respondio 500".
    console.error(`[print] no se pudo armar la salida ${id}:`, error)
    return <ErrorDeHoja titulo={`Salida ${id}`} mensaje={motivoDe(error)} />
  }

  if (!datos) notFound()

  return <HojaDeSalida {...datos} />
}

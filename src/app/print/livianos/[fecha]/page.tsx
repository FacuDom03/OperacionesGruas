import { GrillaLivianosImpresa } from '@/components/grilla-livianos-impresa'
import { movimientosDelDia } from '@/lib/consultas-livianos'
import { accesoDeImpresion } from '@/lib/permisos'

export const dynamic = 'force-dynamic'

export default async function ImprimirLivianosDia({
  params,
  searchParams,
}: {
  params: Promise<{ fecha: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { fecha } = await params
  const { token } = await searchParams

  await accesoDeImpresion(`/print/livianos/${fecha}`, token)

  return <GrillaLivianosImpresa fecha={fecha} movimientos={await movimientosDelDia(fecha)} />
}

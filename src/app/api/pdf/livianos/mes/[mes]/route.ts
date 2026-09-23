import { respuestaPdf } from '@/lib/pdf'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_pedido: Request, { params }: { params: Promise<{ mes: string }> }) {
  await sesionRequerida()

  const { mes } = await params
  if (!/^\d{4}-\d{2}$/.test(mes)) return new Response('Mes invalido. Va aaaa-mm.', { status: 400 })

  return respuestaPdf(`/print/livianos/mes/${mes}`, `livianos-${mes}`, { horizontal: true })
}

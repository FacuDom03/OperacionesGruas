import { respuestaPdf } from '@/lib/pdf'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(pedido: Request, { params }: { params: Promise<{ fecha: string }> }) {
  await sesionRequerida()

  const { fecha } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return new Response('Fecha invalida.', { status: 400 })
  }

  // Solo digitos y comas: es lo unico que puede ser una lista de ids.
  const empresas = new URL(pedido.url).searchParams.get('empresas')
  const filtro = empresas && /^[\d,]+$/.test(empresas) ? `?empresas=${empresas}` : ''

  return respuestaPdf(`/print/dia/${fecha}`, `parte-del-dia-${fecha}`, { consulta: filtro })
}

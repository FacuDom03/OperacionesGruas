import { guardarPdf, pdfDeRuta } from '@/lib/pdf'
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

  const pdf = await pdfDeRuta(`/print/dia/${fecha}`, { consulta: filtro })
  await guardarPdf(`parte-del-dia-${fecha}`, pdf)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="parte-del-dia-${fecha}.pdf"`,
    },
  })
}

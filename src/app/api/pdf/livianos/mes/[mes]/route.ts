import { guardarPdf, pdfDeRuta } from '@/lib/pdf'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_pedido: Request, { params }: { params: Promise<{ mes: string }> }) {
  await sesionRequerida()

  const { mes } = await params
  if (!/^\d{4}-\d{2}$/.test(mes)) return new Response('Mes invalido. Va aaaa-mm.', { status: 400 })

  const pdf = await pdfDeRuta(`/print/livianos/mes/${mes}`, { horizontal: true })
  await guardarPdf(`livianos-${mes}`, pdf)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="livianos-${mes}.pdf"`,
    },
  })
}

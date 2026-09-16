import { guardarPdf, pdfDeRuta } from '@/lib/pdf'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_pedido: Request, { params }: { params: Promise<{ fecha: string }> }) {
  await sesionRequerida()

  const { fecha } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return new Response('Fecha invalida.', { status: 400 })

  // Horizontal: la grilla del GD 208 tiene diez columnas y no entra en vertical.
  const pdf = await pdfDeRuta(`/print/livianos/${fecha}`, { horizontal: true })
  await guardarPdf(`livianos-${fecha}`, pdf)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="livianos-${fecha}.pdf"`,
    },
  })
}

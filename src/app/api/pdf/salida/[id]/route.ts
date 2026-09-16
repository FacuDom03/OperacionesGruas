import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { salidas } from '@/db/schema'
import { guardarPdf, pdfDeRuta } from '@/lib/pdf'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'
// Puppeteer necesita Node: no corre en el edge.
export const runtime = 'nodejs'

export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  await sesionRequerida()

  const { id } = await params
  const [salida] = await db.select().from(salidas).where(eq(salidas.id, Number(id))).limit(1)
  if (!salida) return new Response('No existe esa salida.', { status: 404 })

  const pdf = await pdfDeRuta(`/print/salida/${id}`)

  // Queda guardado con el numero de salida como nombre, para poder adjuntarlo
  // al WhatsApp despues sin volver a generarlo.
  await guardarPdf(salida.numero, pdf)

  return new Response(new Uint8Array(pdf), {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="${salida.numero}.pdf"`,
    },
  })
}

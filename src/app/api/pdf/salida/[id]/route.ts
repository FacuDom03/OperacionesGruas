import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { salidas } from '@/db/schema'
import { respuestaPdf } from '@/lib/pdf'
import { sesionRequerida } from '@/lib/permisos'

export const dynamic = 'force-dynamic'
// Puppeteer necesita Node: no corre en el edge.
export const runtime = 'nodejs'

export async function GET(_pedido: Request, { params }: { params: Promise<{ id: string }> }) {
  await sesionRequerida()

  const { id } = await params
  const [salida] = await db.select().from(salidas).where(eq(salidas.id, Number(id))).limit(1)
  if (!salida) return new Response('No existe esa salida.', { status: 404 })

  // Queda guardado con el numero de salida como nombre, para poder adjuntarlo
  // al WhatsApp despues sin volver a generarlo.
  return respuestaPdf(`/print/salida/${id}`, salida.numero)
}

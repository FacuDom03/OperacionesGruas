import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Central Operativa — Gruas Daniele',
  description: 'Salidas de trabajo, vehiculos livianos y checklists del Grupo Daniele.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      {/* Las tres familias del mockup las sirve la app desde /fuentes, no
          Google. Los PDF los arma Puppeteer abriendo las rutas /print: si en
          ese momento no se puede salir a internet, la hoja salia con la
          tipografia que el navegador tuviera a mano. Ver scripts/bajar-fuentes.mjs. */}
      <body className="min-h-screen">{children}</body>
    </html>
  )
}

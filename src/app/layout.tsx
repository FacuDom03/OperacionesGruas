import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Central Operativa — Gruas Daniele',
  description: 'Salidas de trabajo, vehiculos livianos y checklists del Grupo Daniele.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}

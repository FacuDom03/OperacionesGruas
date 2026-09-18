import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Central Operativa — Gruas Daniele',
  description: 'Salidas de trabajo, vehiculos livianos y checklists del Grupo Daniele.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        {/* Las tres familias del mockup. Por <link> y no por next/font para que
            el build no dependa de poder salir a internet. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen">{children}</body>
    </html>
  )
}

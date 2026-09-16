import '../globals.css'

/**
 * Las paginas /print no llevan la navegacion del panel: son lo que Puppeteer
 * convierte en PDF, y tienen que salir igual en pantalla y en papel.
 */
export default function LayoutImpresion({ children }: { children: React.ReactNode }) {
  return (
    // bg-white en el html tambien: si no, el gris del panel se imprime de fondo.
    <html lang="es-AR" className="bg-white">
      <body className="bg-white text-[11pt] text-black">
        {/* El salto va ANTES de cada hoja menos la primera. Poniendolo despues,
            la ultima dejaba una pagina en blanco al final del PDF. */}
        <style>{`main + main { break-before: page; }`}</style>
        {children}
      </body>
    </html>
  )
}

import '../globals.css'

/**
 * Las páginas /print no llevan la navegación del panel: son lo que Puppeteer
 * convierte en PDF, y tienen que salir igual en pantalla y en papel.
 *
 * No renderiza <html> ni <body>: los pone el layout raíz, y un segundo par
 * anidado lo descarta el navegador junto con sus clases. Por eso el fondo
 * blanco va en una regla de estilo, que sí se aplica. Sin ella, el PDF salía
 * con el gris del panel de fondo.
 */
export default function LayoutImpresion({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        html, body { background: #ffffff; color: #000000; }
        body { font-size: 11pt; }
        /* El salto va ANTES de cada hoja menos la primera: poniéndolo después,
           la última dejaba una página en blanco al final del PDF. */
        main + main { break-before: page; }
      `}</style>
      {children}
    </>
  )
}

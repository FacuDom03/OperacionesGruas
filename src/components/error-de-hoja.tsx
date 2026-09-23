/**
 * Lo que se renderiza cuando una hoja de /print no se puede armar.
 *
 * El motivo va en `data-error-de-hoja`: `pdfDeRuta` lo lee y corta la
 * generacion con ese texto, asi el que pidio el PDF ve **por que** fallo en
 * vez de un "respondio 500". En produccion React borra el mensaje de los
 * errores del servidor, y el digest solo sirve si uno puede mirar el log del
 * contenedor, que no es el caso del que esta imprimiendo.
 *
 * Las rutas /print piden sesion o un token de un solo uso, asi que esto no
 * queda expuesto a cualquiera.
 */
export function ErrorDeHoja({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <main className="mx-auto w-full max-w-[190mm]" data-error-de-hoja={mensaje}>
      <header className="border-b-2 border-black pb-2">
        <h1 className="hdg text-[16pt] font-bold leading-tight">{titulo}</h1>
      </header>
      <p className="mt-4 text-[11pt]">No se pudo armar esta hoja.</p>
      <p className="mt-1 text-[9pt] text-black/60">{mensaje}</p>
    </main>
  )
}

/**
 * El motivo de un error, en una linea.
 *
 * Drizzle envuelve el error del driver y deja el de Postgres en `cause`. El
 * de arriba es el SQL entero —cien columnas— y el de abajo es el que dice que
 * paso de verdad ("relation ... does not exist"), asi que se busca ese primero.
 */
export function motivoDe(error: unknown): string {
  let actual = error as { message?: string; cause?: unknown } | undefined
  let ultimo = ''

  for (let vuelta = 0; actual && vuelta < 5; vuelta++) {
    if (typeof actual.message === 'string' && actual.message) ultimo = actual.message
    actual = actual.cause as typeof actual
  }

  const texto = ultimo || String(error)
  return texto.replace(/\s+/g, ' ').trim().slice(0, 300)
}

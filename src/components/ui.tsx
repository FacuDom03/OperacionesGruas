import Link from 'next/link'

/* Piezas de interfaz compartidas. Nada de estado del lado del cliente: son
   componentes de servidor, la interaccion la resuelven los formularios. */

export function Titulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-xl font-semibold tracking-tight">{children}</h1>
      {accion}
    </div>
  )
}

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-borde)] bg-[var(--color-panel)]">
      {children}
    </div>
  )
}

export function Tabla({ cabeceras, children }: { cabeceras: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--color-borde)] text-left text-xs uppercase tracking-wide text-[var(--color-tenue)]">
          {cabeceras.map((c) => (
            <th key={c} className="px-4 py-2 font-medium">{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Fila({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-[var(--color-borde)] last:border-0 hover:bg-[var(--color-fondo)]">{children}</tr>
}

export function Celda({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2 ${className}`}>{children}</td>
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-8 text-center text-sm text-[var(--color-tenue)]">{children}</p>
}

export function Boton({ children, ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      {...props}
      className="rounded-md bg-[var(--color-acento)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export function BotonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md bg-[var(--color-acento)] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
    >
      {children}
    </Link>
  )
}

export function Campo({
  etiqueta, nombre, valor, tipo = 'text', requerido = false, ayuda,
}: {
  etiqueta: string
  nombre: string
  valor?: string | number | null
  tipo?: string
  requerido?: boolean
  ayuda?: string
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{etiqueta}</span>
      <input
        name={nombre}
        type={tipo}
        required={requerido}
        defaultValue={valor ?? ''}
        className="mt-1 w-full rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
      />
      {ayuda ? <span className="mt-1 block text-xs text-[var(--color-tenue)]">{ayuda}</span> : null}
    </label>
  )
}

export function Seleccion({
  etiqueta, nombre, valor, opciones, vacio = '—',
}: {
  etiqueta: string
  nombre: string
  valor?: string | number | null
  opciones: { valor: string | number; texto: string }[]
  vacio?: string | null
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{etiqueta}</span>
      <select
        name={nombre}
        defaultValue={valor ?? ''}
        className="mt-1 w-full rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
      >
        {vacio !== null ? <option value="">{vacio}</option> : null}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </label>
  )
}

export function Casilla({
  etiqueta, nombre, marcado = false,
}: {
  etiqueta: string
  nombre: string
  marcado?: boolean
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        name={nombre}
        defaultChecked={marcado}
        className="h-4 w-4 rounded border-[var(--color-borde)]"
      />
      <span className="text-sm">{etiqueta}</span>
    </label>
  )
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{children}</p>
  )
}

/**
 * Campo de texto con sugerencias (datalist): deja elegir uno de los valores que
 * ya existen o escribir uno nuevo. Sirve para el tipo de equipo, que hay que
 * poder normalizar sin quedar encerrado en una lista fija.
 */
export function CampoSugerido({
  etiqueta, nombre, valor, sugerencias, requerido = false, ayuda,
}: {
  etiqueta: string
  nombre: string
  valor?: string | null
  sugerencias: string[]
  requerido?: boolean
  ayuda?: string
}) {
  const listaId = `sugerencias-${nombre}`
  return (
    <label className="block">
      <span className="block text-sm font-medium">{etiqueta}</span>
      <input
        name={nombre}
        list={listaId}
        required={requerido}
        defaultValue={valor ?? ''}
        className="mt-1 w-full rounded-md border border-[var(--color-borde)] bg-[var(--color-panel)] px-3 py-2 text-sm outline-none focus:border-[var(--color-acento)]"
      />
      <datalist id={listaId}>
        {sugerencias.map((s) => <option key={s} value={s} />)}
      </datalist>
      {ayuda ? <span className="mt-1 block text-xs text-[var(--color-tenue)]">{ayuda}</span> : null}
    </label>
  )
}

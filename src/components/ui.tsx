import Link from 'next/link'

/* Piezas de interfaz compartidas, con los valores del mockup. */

/** Encabezado de pantalla: título condensado, bajada y acciones a la derecha. */
export function Titulo({
  children,
  bajada,
  accion,
}: {
  children: React.ReactNode
  bajada?: React.ReactNode
  accion?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h1 className="hdg text-[28px] font-bold leading-tight">{children}</h1>
        {bajada ? <p className="mt-0.5 text-[13px] text-[var(--color-tenue)]">{bajada}</p> : null}
      </div>
      {accion ? <div className="flex flex-shrink-0 items-center gap-2">{accion}</div> : null}
    </div>
  )
}

/** Tarjeta de indicador del tablero. La franja de arriba le da el color. */
export function Tarjeta({
  etiqueta,
  valor,
  detalle,
  franja = 'oscura',
  sobre,
}: {
  etiqueta: string
  valor: React.ReactNode
  detalle?: React.ReactNode
  franja?: 'oscura' | 'acento' | 'verde' | 'neutra'
  /** Texto chico de arriba a la derecha del valor, como el "/17". */
  sobre?: string
}) {
  const franjas = {
    oscura: 'border-t-[var(--color-texto)]',
    acento: 'border-t-[var(--color-acento)]',
    verde: 'border-t-[var(--color-verde)]',
    neutra: 'border-t-[var(--color-borde-fuerte)]',
  }

  return (
    <div className={`rounded-[5px] border border-[var(--color-borde)] border-t-[3px] ${franjas[franja]} bg-[var(--color-panel)] px-4 py-3.5`}>
      <div className="hdg text-[13px] font-semibold text-[var(--color-tenue)]">{etiqueta}</div>
      <div className="mono text-[34px] font-semibold leading-[1.15]">
        {valor}
        {sobre ? <span className="text-[20px] text-[var(--color-tenue-2)]">/{sobre}</span> : null}
      </div>
      {detalle ? <div className="text-xs text-[var(--color-tenue)]">{detalle}</div> : null}
    </div>
  )
}

export function Panel({ titulo, extra, children }: { titulo?: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[5px] border border-[var(--color-borde)] bg-[var(--color-panel)]">
      {titulo ? (
        <div className="flex items-center justify-between border-b border-[var(--color-borde)] px-4 py-3">
          <h2 className="hdg text-[17px] font-semibold">{titulo}</h2>
          {extra}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function Tabla({ cabeceras, children }: { cabeceras: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="border-b border-[var(--color-borde)] bg-[var(--color-panel-suave)] text-left">
          {cabeceras.map((c) => (
            <th key={c} className="hdg px-4 py-2.5 text-[12px] font-semibold text-[var(--color-tenue)]">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  )
}

export function Fila({ children, destacada = false }: { children: React.ReactNode; destacada?: boolean }) {
  return (
    <tr className={`border-b border-[var(--color-borde)] last:border-0 hover:bg-[var(--color-panel-suave)] ${destacada ? 'bg-[#fdfaf5]' : ''}`}>
      {children}
    </tr>
  )
}

export function Celda({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-2.5 ${className}`}>{children}</td>
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-[13px] text-[var(--color-tenue)]">{children}</p>
}

/** Guioncito de los campos sin dato, como en el mockup. */
export function SinDato() {
  return <span className="text-[var(--color-tenue-2)]">—</span>
}

const ESTILOS_BOTON = {
  acento: 'bg-[var(--color-acento)] text-white hover:bg-[var(--color-acento-oscuro)]',
  verde: 'bg-[var(--color-verde)] text-white hover:opacity-90',
  blanco: 'border border-[var(--color-borde-fuerte)] bg-white hover:bg-[var(--color-panel-suave)]',
}

export type EstiloBoton = keyof typeof ESTILOS_BOTON

const BASE_BOTON = 'inline-flex items-center gap-1.5 rounded-[5px] px-4 py-2.5 text-[13px] font-semibold disabled:opacity-50'

export function Boton({ estilo = 'acento', children, ...props }: React.ComponentProps<'button'> & { estilo?: EstiloBoton }) {
  return (
    <button {...props} className={`${BASE_BOTON} ${ESTILOS_BOTON[estilo]}`}>
      {children}
    </button>
  )
}

export function BotonLink({
  href, estilo = 'acento', nuevaPestania = false, children,
}: {
  href: string
  estilo?: EstiloBoton
  nuevaPestania?: boolean
  children: React.ReactNode
}) {
  if (nuevaPestania) {
    return (
      <a href={href} target="_blank" className={`${BASE_BOTON} ${ESTILOS_BOTON[estilo]}`}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={`${BASE_BOTON} ${ESTILOS_BOTON[estilo]}`}>
      {children}
    </Link>
  )
}

const ESTILOS_ETIQUETA = {
  acento: 'bg-[var(--color-acento-suave)] text-[var(--color-acento-oscuro)]',
  verde: 'bg-[var(--color-verde-suave)] text-[var(--color-verde-texto)]',
  neutra: 'bg-[var(--color-neutro-suave)] text-[var(--color-neutro-texto)]',
  apagada: 'bg-[var(--color-neutro-suave)] text-[var(--color-tenue-2)] line-through',
}

/** Pastilla de estado. */
export function Etiqueta({
  estilo = 'neutra',
  children,
}: {
  estilo?: keyof typeof ESTILOS_ETIQUETA
  children: React.ReactNode
}) {
  return (
    <span className={`hdg inline-block rounded-[3px] px-2 py-0.5 text-[11.5px] font-semibold ${ESTILOS_ETIQUETA[estilo]}`}>
      {children}
    </span>
  )
}

/* ── Campos de formulario ───────────────────────────────────────────── */

const ENTRADA =
  'mt-1 w-full rounded-[5px] border border-[var(--color-borde-fuerte)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[var(--color-acento)]'

export function Etiquetita({ children }: { children: React.ReactNode }) {
  return <span className="hdg block text-[12px] font-semibold text-[var(--color-tenue)]">{children}</span>
}

export function Campo({
  etiqueta, nombre, valor, tipo = 'text', requerido = false, ayuda, mono = false,
}: {
  etiqueta: string
  nombre: string
  valor?: string | number | null
  tipo?: string
  requerido?: boolean
  ayuda?: string
  mono?: boolean
}) {
  return (
    <label className="block">
      <Etiquetita>{etiqueta}</Etiquetita>
      <input
        name={nombre}
        type={tipo}
        required={requerido}
        defaultValue={valor ?? ''}
        className={`${ENTRADA} ${mono ? 'mono' : ''}`}
      />
      {ayuda ? <span className="mt-1 block text-[11px] text-[var(--color-tenue)]">{ayuda}</span> : null}
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
      <Etiquetita>{etiqueta}</Etiquetita>
      <select name={nombre} defaultValue={valor ?? ''} className={ENTRADA}>
        {vacio !== null ? <option value="">{vacio}</option> : null}
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>{o.texto}</option>
        ))}
      </select>
    </label>
  )
}

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
      <Etiquetita>{etiqueta}</Etiquetita>
      <input name={nombre} list={listaId} required={requerido} defaultValue={valor ?? ''} className={ENTRADA} />
      <datalist id={listaId}>
        {sugerencias.map((s) => <option key={s} value={s} />)}
      </datalist>
      {ayuda ? <span className="mt-1 block text-[11px] text-[var(--color-tenue)]">{ayuda}</span> : null}
    </label>
  )
}

export function Casilla({ etiqueta, nombre, marcado = false }: { etiqueta: string; nombre: string; marcado?: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" name={nombre} defaultChecked={marcado} className="h-4 w-4 accent-[var(--color-acento)]" />
      <span className="text-[13px]">{etiqueta}</span>
    </label>
  )
}

export function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[5px] border border-[#f0d9a8] bg-[var(--color-acento-suave)] px-3 py-2.5 text-[13px] text-[var(--color-acento-oscuro)]">
      {children}
    </div>
  )
}

export function ErrorCampo({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[5px] bg-[#fdecec] px-3 py-2 text-[13px] text-[#a32020]">{children}</p>
}

import { formatearFecha, formatearHora } from '@/lib/formato'

/* La hoja por unidad del GD 200, en A4 vertical. Es lo que Puppeteer
   convierte en PDF, asi que no lleva nada interactivo. */

const NOMBRE_ROL: Record<string, string> = {
  chofer: 'Chofer',
  operador_grua: 'Operador de grúa',
  jefe_cuadrilla: 'Jefe de cuadrilla',
  ayudante: 'Ayudante',
  acompanante: 'Acompañante',
}

const NOMBRE_GESTION: Record<string, string> = {
  permiso_corte: 'Permiso de corte',
  traslado_carreton: 'Traslado en carretón',
  otros: 'Otros',
}

const NOMBRE_ESTADO: Record<string, string> = {
  a_confirmar: 'A confirmar',
  en_ejecucion: 'En ejecución',
  finalizado: 'Finalizado',
  anulado: 'Anulado',
}

function Dato({ etiqueta, children, mono = false }: {
  etiqueta: string
  children?: React.ReactNode
  /** Para los datos que alinean en columna: internos, horas, numeros. */
  mono?: boolean
}) {
  return (
    <div className="border border-black/20 px-2 py-1">
      <div className="hdg text-[7.5pt] text-black/50">{etiqueta}</div>
      <div className={`min-h-[14px] text-[10pt] ${mono ? 'mono' : ''}`}>{children || ' '}</div>
    </div>
  )
}

export type DatosHoja = {
  salida: {
    numero: string
    fecha: string
    ordenDia: number
    ot: string | null
    remito: string | null
    horaSalida: string | null
    lugarCarga: string | null
    contactoCarga: string | null
    telefonoCarga: string | null
    lugarDescarga: string | null
    contactoDescarga: string | null
    telefonoDescarga: string | null
    gestion: string | null
    estado: string
    observaciones: string | null
  }
  equipo: { interno: string; marca: string | null; modelo: string | null; patente: string | null; tipo: string }
  empresa: { razonSocial: string; nombreCorto: string; cuit: string | null }
  cliente: { razonSocial: string } | null
  cuadrilla: { nombre: string; legajo: string | null; rol: string; esSuplente: boolean }[]
  /** Las que salieron con este trabajo. Si no hubo, la seccion no se imprime. */
  herramientas?: { codigo: string; nombre: string; haciaPersona: string | null; haciaUnidad: string | null }[]
  verificador: string | null
  operador: string | null
  auxiliar: string | null
}

export function HojaDeSalida({
  salida, equipo, empresa, cliente, cuadrilla, herramientas = [], verificador, operador, auxiliar,
}: DatosHoja) {
  return (
    <main className="mx-auto w-full max-w-[190mm]">
      <header className="flex items-start justify-between border-b-2 border-black pb-2">
        <div>
          <h1 className="hdg text-[16pt] font-bold leading-tight">{empresa.nombreCorto}</h1>
          <p className="text-[8pt] text-black/60">
            {empresa.razonSocial}{empresa.cuit ? ` · CUIT ${empresa.cuit}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="hdg text-[8.5pt] text-black/60">Salida de trabajo</p>
          <p className="mono text-[15pt] font-bold leading-tight">{salida.numero}</p>
          <p className="mono text-[9pt]">{formatearFecha(salida.fecha)} · Trabajo {salida.ordenDia}</p>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-5">
        <Dato etiqueta="Unidad" mono>{equipo.interno}</Dato>
        <Dato etiqueta="Marca y modelo">{[equipo.marca, equipo.modelo].filter(Boolean).join(' ')}</Dato>
        <Dato etiqueta="Patente" mono>{equipo.patente}</Dato>
        <Dato etiqueta="Hora de salida" mono>{formatearHora(salida.horaSalida)}</Dato>
        <Dato etiqueta="Auxiliar" mono>{auxiliar}</Dato>
      </section>

      <section className="grid grid-cols-4">
        <Dato etiqueta="Cliente">{cliente?.razonSocial}</Dato>
        <Dato etiqueta="OT" mono>{salida.ot}</Dato>
        <Dato etiqueta="Remito" mono>{salida.remito}</Dato>
        <Dato etiqueta="Estado">{NOMBRE_ESTADO[salida.estado]}</Dato>
      </section>

      <section className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <h2 className="hdg mb-1 text-[10pt] font-bold">Carga</h2>
          <Dato etiqueta="Lugar">{salida.lugarCarga}</Dato>
          <Dato etiqueta="Contacto">{salida.contactoCarga}</Dato>
          <Dato etiqueta="Teléfono" mono>{salida.telefonoCarga}</Dato>
        </div>
        <div>
          <h2 className="hdg mb-1 text-[10pt] font-bold">Descarga</h2>
          <Dato etiqueta="Lugar">{salida.lugarDescarga}</Dato>
          <Dato etiqueta="Contacto">{salida.contactoDescarga}</Dato>
          <Dato etiqueta="Teléfono" mono>{salida.telefonoDescarga}</Dato>
        </div>
      </section>

      <section className="mt-3">
        <h2 className="hdg mb-1 text-[10pt] font-bold">
          Personal ({cuadrilla.length})
        </h2>
        <table className="w-full border-collapse text-[10pt]">
          <thead>
            <tr className="hdg border-y border-black/30 text-left text-[8.5pt] text-black/60">
              <th className="py-1 font-medium">Apellido y nombre</th>
              <th className="py-1 font-medium">Legajo</th>
              <th className="py-1 font-medium">Rol</th>
              <th className="py-1 font-medium">Titular</th>
            </tr>
          </thead>
          <tbody>
            {cuadrilla.length === 0 ? (
              <tr><td colSpan={4} className="py-2 text-black/50">Sin personal asignado.</td></tr>
            ) : (
              cuadrilla.map((p) => (
                <tr key={`${p.nombre}-${p.rol}`} className="border-b border-black/10">
                  <td className="py-1">{p.nombre}</td>
                  <td className="mono py-1">{p.legajo ?? ''}</td>
                  <td className="py-1">{NOMBRE_ROL[p.rol] ?? p.rol}</td>
                  <td className="py-1">{p.esSuplente ? 'Suplente' : 'Titular'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {herramientas.length > 0 ? (
        <section className="mt-3">
          <h2 className="hdg mb-1 text-[10pt] font-bold">
            Herramientas ({herramientas.length})
          </h2>
          <table className="w-full border-collapse text-[10pt]">
            <thead>
              <tr className="hdg border-y border-black/30 text-left text-[8.5pt] text-black/60">
                <th className="py-1 font-medium">Código</th>
                <th className="py-1 font-medium">Herramienta</th>
                <th className="py-1 font-medium">A cargo de</th>
              </tr>
            </thead>
            <tbody>
              {herramientas.map((h) => (
                <tr key={h.codigo} className="border-b border-black/10">
                  <td className="mono py-1">{h.codigo}</td>
                  <td className="py-1">{h.nombre}</td>
                  <td className="py-1">{h.haciaPersona ?? h.haciaUnidad ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mt-3 grid grid-cols-3">
        <Dato etiqueta="Verificador">{verificador}</Dato>
        <Dato etiqueta="Operador">{operador}</Dato>
        <Dato etiqueta="Gestión">{salida.gestion ? NOMBRE_GESTION[salida.gestion] : null}</Dato>
      </section>

      <section className="mt-3">
        <h2 className="hdg mb-1 text-[10pt] font-bold">Observaciones</h2>
        <div className="min-h-[60px] border border-black/20 p-2 text-[10pt] whitespace-pre-wrap">
          {salida.observaciones ?? ''}
        </div>
      </section>

      <section className="hdg mt-10 grid grid-cols-3 gap-6 text-center text-[8.5pt]">
        {['Operaciones', 'Chofer', 'Conformidad del cliente'].map((firma) => (
          <div key={firma}>
            <div className="border-t border-black pt-1">{firma}</div>
          </div>
        ))}
      </section>
    </main>
  )
}

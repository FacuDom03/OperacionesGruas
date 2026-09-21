/** A dónde lleva cada entidad auditada, cuando tiene pantalla propia. */
const RUTAS: Record<string, (id: number) => string> = {
  clientes: (id) => `/maestros/clientes/${id}`,
  empresas: (id) => `/maestros/empresas/${id}`,
  equipos: (id) => `/maestros/equipos/${id}`,
  lugares: (id) => `/maestros/lugares/${id}`,
  personal: (id) => `/maestros/personal/${id}`,
  salidas: (id) => `/salidas/${id}`,
  usuarios: (id) => `/maestros/usuarios/${id}`,
}

export function enlaceDeEntidad(entidad: string, entidadId: number | null): string | null {
  if (entidadId === null) return null
  const ruta = RUTAS[entidad]
  return ruta ? ruta(entidadId) : null
}

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Requerido por el Dockerfile: copia .next/standalone y arranca con node server.js.
  output: 'standalone',

  // Puppeteer y pg no se empaquetan: se cargan del node_modules del servidor.
  serverExternalPackages: ['postgres', 'puppeteer-core'],

  webpack: (config) => {
    // src/db/index.ts importa './schema.js': extension ESM, que es lo que
    // necesita tsx para correr scripts/importar-excel.ts fuera de Next.
    // webpack tiene que resolver ese .js al .ts que existe de verdad.
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },

  eslint: {
    // El lint corre aparte, no dentro del build de produccion.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig

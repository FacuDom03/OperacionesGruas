# syntax=docker/dockerfile:1

# ---------- dependencias ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV TZ=America/Argentina/Buenos_Aires
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Chromium para generar los PDF, y tipografias para que no salgan cuadraditos
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      fonts-dejavu-core \
      fonts-noto-core \
      ca-certificates \
      tzdata \
      curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system app && useradd --system --gid app --create-home app

# Next.js en modo standalone (requiere output: 'standalone' en next.config.ts)
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static

# SQL de las migraciones: las aplica la app al arrancar, desde src/instrumentation.ts
COPY --from=builder --chown=app:app /app/drizzle ./drizzle

# Importador de maestros ya compilado a JS, con los dos Excel. Sin esto, el paso
# 7 de DEPLOY.md no tiene con que correr: la imagen no lleva ni tsx ni scripts/.
COPY --from=builder --chown=app:app /app/dist/importar-excel.js ./scripts/importar-excel.js
COPY --from=builder --chown=app:app /app/docs/fuentes ./docs/fuentes

# Carpeta de los PDF generados. Montar un volumen aca en EasyPanel.
RUN mkdir -p /app/storage/pdf && chown -R app:app /app/storage

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]

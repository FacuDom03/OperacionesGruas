#!/usr/bin/env bash
#
# Central Operativa — Gruas Daniele
# Respaldo de la base. Deja un archivo por corrida y borra los viejos.
#
#   bash scripts/respaldo.sh
#   npm run respaldo
#
# Variables:
#   DATABASE_URL     de donde leer. Si no esta, se toma del .env.
#   RESPALDO_PATH    donde guardar. Por defecto /respaldos.
#   RESPALDO_DIAS    cuantos dias conservar. Por defecto 14.
#   PG_DUMP          el pg_dump a usar. Sirve cuando el de la maquina es de
#   PG_RESTORE       otra version que el servidor, por ejemplo:
#                      PG_DUMP="docker exec -i postgres pg_dump" 
#
# El formato es el "custom" de Postgres (-Fc): viene comprimido y se restaura
# con pg_restore, tabla por tabla si hace falta.
#
# Para restaurar sobre una base vacia:
#   pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" el-archivo.dump
#
# Si la version de pg_dump de la maquina no coincide con la del servidor, se
# corre el del contenedor de Postgres, que siempre coincide.
#
# Los PDF de PDF_STORAGE_PATH no se respaldan: se vuelven a generar desde la
# app con los datos de la base. Lo que no se puede volver a generar es esto.

set -euo pipefail

cd "$(dirname "$0")/.."

# La URL puede venir del entorno (en el servidor) o del .env (en desarrollo).
if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  DATABASE_URL="$(grep -m1 '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"'"'"'')"
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "  Falta DATABASE_URL. Pasala por variable de entorno o dejala en el .env." >&2
  exit 1
fi

PG_DUMP="${PG_DUMP:-pg_dump}"
PG_RESTORE="${PG_RESTORE:-pg_restore}"

DESTINO="${RESPALDO_PATH:-/respaldos}"
DIAS="${RESPALDO_DIAS:-14}"
SELLO="$(date +%Y-%m-%d-%H%M)"
ARCHIVO="$DESTINO/central-operativa-$SELLO.dump"

mkdir -p "$DESTINO"

echo "  Respaldando en $ARCHIVO"
# --no-owner para que se pueda restaurar con otro usuario del que creo las tablas.
# El archivo sale por la salida estandar: asi funciona igual cuando pg_dump
# corre adentro del contenedor de Postgres, que no ve este disco.
$PG_DUMP --format=custom --no-owner "$DATABASE_URL" > "$ARCHIVO"

# Un archivo que no se puede leer no es un respaldo. Se comprueba antes de
# borrar los viejos, asi nunca se queda sin ninguno bueno.
if ! $PG_RESTORE --list < "$ARCHIVO" > /dev/null 2>&1; then
  echo "  El archivo salio ilegible. No se borra nada." >&2
  rm -f "$ARCHIVO"
  exit 1
fi

TABLAS="$($PG_RESTORE --list < "$ARCHIVO" | grep -c 'TABLE DATA' || true)"
PESO="$(du -h "$ARCHIVO" | cut -f1)"
echo "  Listo: $PESO, $TABLAS $([ "$TABLAS" -eq 1 ] && echo 'tabla' || echo 'tablas') con datos."

if [ "$TABLAS" -eq 0 ]; then
  echo "  Ninguna tabla trajo datos. Revisa la DATABASE_URL antes de confiar en esto." >&2
  exit 1
fi

# Rotacion: se van los que pasaron los dias que se pidieron.
BORRADOS="$(find "$DESTINO" -maxdepth 1 -name 'central-operativa-*.dump' -mtime "+$DIAS" -print -delete | wc -l)"
if [ "$BORRADOS" -gt 0 ]; then
  echo "  Se $([ "$BORRADOS" -eq 1 ] && echo 'borro 1 respaldo' || echo "borraron $BORRADOS respaldos") de mas de $DIAS dias."
fi

QUEDAN="$(find "$DESTINO" -maxdepth 1 -name 'central-operativa-*.dump' | wc -l)"
echo "  $([ "$QUEDAN" -eq 1 ] && echo 'Queda 1 respaldo' || echo "Quedan $QUEDAN respaldos") en $DESTINO."

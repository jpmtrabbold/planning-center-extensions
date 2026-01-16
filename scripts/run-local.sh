#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

cd "$ROOT_DIR"

mkdir -p "$ROOT_DIR/.npm-cache"
export NPM_CONFIG_CACHE="$ROOT_DIR/.npm-cache"
export NPM_CONFIG_LOGLEVEL=error

if [[ ! -d node_modules ]]; then
  echo "node_modules not found. Run: npm install"
  exit 1
fi

npm run build

PORT="${PORT:-5173}"
echo "Serving at http://localhost:${PORT}/ (press Ctrl+C to stop)"
PORT="$PORT" node dist/server/server.js

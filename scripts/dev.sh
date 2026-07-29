#!/usr/bin/env bash
# Starts the mortgage portal for local development: the FastAPI backend on
# port 8500 and the Angular dev server on port 4200, both with hot reload.
# Works on Ubuntu and macOS (anything with bash). Ctrl+C stops both.
#
#   ./scripts/dev.sh
#
# Prefers uv if it's installed, falls back to python3 -m venv otherwise, so
# it runs on a machine that only has a plain Python + Node toolchain.

set -e

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$HERE/backend"
FRONTEND="$HERE/frontend"

echo "== Mortgage Borrower Portal: local dev =="

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3 not found. Install it from https://www.python.org/downloads/ first." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm not found. Install it from https://nodejs.org/ first." >&2
  exit 1
fi

ANSWER_ALL=false

# Asks before installing anything, accepting All/Yes/No (or a/y/n, any case).
# "All" is remembered so later installs in this same run proceed without asking again.
confirm_install() {
  local what="$1"
  if [ "$ANSWER_ALL" = true ]; then
    return 0
  fi
  while true; do
    read -r -p "Install $what? [A]ll / [Y]es / [N]o: " reply
    case "$reply" in
      [Aa]*) ANSWER_ALL=true; return 0 ;;
      [Yy]*) return 0 ;;
      [Nn]*) return 1 ;;
      *) echo "Please answer A, Y, or N." ;;
    esac
  done
}

cd "$BACKEND"

if [ ! -d ".venv" ]; then
  if confirm_install "backend dependencies (creates .venv, installs requirements.txt)"; then
    echo "-- creating backend virtual environment --"
    if command -v uv >/dev/null 2>&1; then
      uv venv .venv
    else
      python3 -m venv .venv
    fi
    echo "-- installing backend dependencies --"
    if command -v uv >/dev/null 2>&1; then
      uv pip install -r requirements.txt --python .venv >/dev/null
    else
      ./.venv/bin/pip install -r requirements.txt >/dev/null
    fi
  else
    echo "Backend dependencies are required to run the app. Exiting." >&2
    exit 1
  fi
fi

echo "-- starting backend on http://localhost:8500 --"
./.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8500 &
BACKEND_PID=$!

cleanup() {
  echo ""
  echo "-- stopping backend --"
  kill "$BACKEND_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$FRONTEND"

if [ ! -d "node_modules" ]; then
  if confirm_install "frontend dependencies (npm install)"; then
    echo "-- installing frontend dependencies --"
    npm install
  else
    echo "Frontend dependencies are required to run the app. Exiting." >&2
    exit 1
  fi
fi

echo "-- starting frontend on http://localhost:4200 (Ctrl+C stops both) --"
npm start

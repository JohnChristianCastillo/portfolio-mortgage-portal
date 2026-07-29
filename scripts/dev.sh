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

# Offers to auto-install a missing runtime via the system package manager
# (apt on Ubuntu, brew on macOS). Always asks first, since this is a
# system-wide install (apt needs sudo) rather than something scoped to this
# project. Declining just points at the manual download instead.
offer_runtime_install() {
  local name="$1" apt_pkgs="$2" brew_pkg="$3" url="$4"
  local install_cmd=""
  if command -v apt-get >/dev/null 2>&1; then
    install_cmd="sudo apt-get update && sudo apt-get install -y $apt_pkgs"
  elif command -v brew >/dev/null 2>&1; then
    install_cmd="brew install $brew_pkg"
  else
    echo "$name not found, and no supported package manager (apt/brew) was found to install it automatically."
    echo "Install it manually from $url"
    exit 1
  fi
  while true; do
    read -r -p "$name not found. Install it automatically now with: $install_cmd ? [Y/N]: " reply
    case "$reply" in
      [Yy]*)
        eval "$install_cmd"
        hash -r
        return 0
        ;;
      [Nn]*)
        echo "Install it manually from $url, then re-run this script."
        exit 1
        ;;
      *) echo "Please answer Y or N." ;;
    esac
  done
}

if ! command -v python3 >/dev/null 2>&1; then
  offer_runtime_install "Python 3" "python3 python3-venv python3-pip" "python" "https://www.python.org/downloads/"
  if ! command -v python3 >/dev/null 2>&1; then
    echo "Python 3 still not found after install. Open a new terminal and try again." >&2
    exit 1
  fi
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  offer_runtime_install "Node.js/npm" "nodejs npm" "node" "https://nodejs.org/"
  if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
    echo "Node.js/npm still not found after install. Open a new terminal and try again." >&2
    exit 1
  fi
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

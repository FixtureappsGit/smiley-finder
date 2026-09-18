#!/usr/bin/env bash
# =============================================================================
# SmileyID — Deploy Script
#
# Usage:
#   ./deploy.sh              → production build + start  (nginx frontend)
#   ./deploy.sh --dev        → dev mode  (Vite hot-reload frontend)
#   ./deploy.sh --rebuild    → force full rebuild (no cache)
#   ./deploy.sh --down       → stop containers, prune volumes + cache
# =============================================================================

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[deploy]${RESET} $*"; }
ok()   { echo -e "${GREEN}[  ok  ]${RESET} $*"; }
warn() { echo -e "${YELLOW}[ warn ]${RESET} $*"; }
fail() { echo -e "${RED}[ fail ]${RESET} $*"; exit 1; }

# ── Flags ────────────────────────────────────────────────────────────────────
REBUILD=false
DOWN=false
DEV=false

for arg in "$@"; do
  case $arg in
    --rebuild) REBUILD=true ;;
    --down)    DOWN=true ;;
    --dev)     DEV=true ;;
    *) echo "Unknown flag: $arg"; exit 1 ;;
  esac
done

# Build the compose command (add dev override if requested)
COMPOSE_CMD="docker compose"
if $DEV; then
  COMPOSE_CMD="docker compose -f docker-compose.yml -f docker-compose.dev.yml"
fi

# ── Tear down ────────────────────────────────────────────────────────────────
if $DOWN; then
  log "Stopping containers and removing orphans..."
  $COMPOSE_CMD down --remove-orphans

  log "Pruning unused Docker volumes..."
  docker volume prune -f

  log "Pruning build cache..."
  docker builder prune -f

  log "Removing dangling images..."
  docker image prune -f

  ok "Environment fully cleaned."
  exit 0
fi

# ── Pre-flight: Docker ────────────────────────────────────────────────────────
log "Checking Docker daemon..."
docker info > /dev/null 2>&1 || fail "Docker is not running. Start Docker Desktop or dockerd and retry."
ok "Docker is running."

log "Checking docker compose..."
docker compose version > /dev/null 2>&1 || fail "docker compose plugin not found."
ok "docker compose is available."

# ── .env check ────────────────────────────────────────────────────────────────
if [ ! -f "backend/.env" ]; then
  warn "backend/.env not found — creating from example"
  cp backend/.env.example backend/.env
  warn "Review backend/.env before production use (change SECRET_KEY!)"
fi

# ── Pre-clean ────────────────────────────────────────────────────────────────
log "Pruning dangling images and unused build cache..."
docker image prune -f > /dev/null 2>&1 || true
docker builder prune -f --filter type=exec.cachemount > /dev/null 2>&1 || true
ok "Pre-clean done."

# ── Build ─────────────────────────────────────────────────────────────────────
if $REBUILD; then
  log "Building all images — no cache..."
  $COMPOSE_CMD build --no-cache --parallel
else
  log "Building images..."
  $COMPOSE_CMD build --parallel
fi
ok "Images built."

log "Waiting for PostgreSQL to accept connections..."
MAX_WAIT=30; ELAPSED=0
until pg_isready -h 127.0.0.1 -p 5337 -U smiley -d smileydb > /dev/null 2>&1; do
  [ $ELAPSED -ge $MAX_WAIT ] && fail "PostgreSQL not ready after ${MAX_WAIT}s. Check: docker compose logs db"
  sleep 1; ELAPSED=$((ELAPSED+1)); printf "."
done
echo ""; ok "PostgreSQL ready (${ELAPSED}s)."

# ── Migrations ────────────────────────────────────────────────────────────────
log "Running Django migrations..."
$COMPOSE_CMD run --rm --no-deps backend python manage.py migrate --noinput
ok "Migrations complete."

# Check for any remaining unapplied migrations
PENDING=$($COMPOSE_CMD run --rm --no-deps backend \
  python manage.py showmigrations --plan 2>/dev/null | grep -c "^\[ \]" || true)
if [ "$PENDING" -gt 0 ]; then
  warn "$PENDING migration(s) still pending — you may need to run makemigrations."
fi

# ── Static files ──────────────────────────────────────────────────────────────
log "Collecting static files..."
$COMPOSE_CMD run --rm --no-deps backend python manage.py collectstatic --noinput --clear > /dev/null
ok "Static files collected."

# ── Start all services ────────────────────────────────────────────────────────
log "Starting all services..."
$COMPOSE_CMD up -d
ok "All services up."

# ── Health checks ─────────────────────────────────────────────────────────────
log "Waiting for Django backend..."
MAX_WAIT=40; ELAPSED=0
until curl -sf http://localhost:8006/api/auth/register/ -X OPTIONS > /dev/null 2>&1; do
  [ $ELAPSED -ge $MAX_WAIT ] && { warn "Backend slow — check: docker compose logs backend"; break; }
  sleep 1; ELAPSED=$((ELAPSED+1)); printf "."
done
echo ""
[ $ELAPSED -lt $MAX_WAIT ] && ok "Backend responding at http://localhost:8006"

if $DEV; then
  FRONTEND_PORT=5173
else
  FRONTEND_PORT=3004
fi

log "Waiting for frontend..."
MAX_WAIT=30; ELAPSED=0
until curl -sf "http://localhost:${FRONTEND_PORT}/" > /dev/null 2>&1; do
  [ $ELAPSED -ge $MAX_WAIT ] && { warn "Frontend slow — check: docker compose logs frontend"; break; }
  sleep 1; ELAPSED=$((ELAPSED+1)); printf "."
done
echo ""
[ $ELAPSED -lt $MAX_WAIT ] && ok "Frontend responding at http://localhost:${FRONTEND_PORT}"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}  SmileyID deployed successfully!${RESET}"
if $DEV; then
  echo -e "  Mode: ${YELLOW}Development (Vite hot-reload)${RESET}"
else
  echo -e "  Mode: ${GREEN}Production (nginx)${RESET}"
fi
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"
echo -e "  Parent Portal  →  ${CYAN}http://localhost:${FRONTEND_PORT}${RESET}"
echo -e "  Backend API    →  ${CYAN}http://localhost:8006/api/${RESET}"
echo -e "  Django Admin   →  ${CYAN}http://localhost:8006/django-admin/${RESET}"
echo -e "  Admin Portal   →  ${CYAN}http://localhost:${FRONTEND_PORT}/admin${RESET}"
echo ""
echo -e "  ${YELLOW}Default admin credentials:${RESET}"
echo -e "    Email:    admin@smileyid.in"
echo -e "    Password: admin1234"
echo ""
echo -e "  Useful commands:"
echo -e "  ${CYAN}docker compose logs -f${RESET}         → all logs"
echo -e "  ${CYAN}docker compose logs -f backend${RESET} → backend only"
echo -e "  ${CYAN}docker compose ps${RESET}              → container status"
echo -e "  ${CYAN}./deploy.sh --rebuild${RESET}          → rebuild from scratch"
echo -e "  ${CYAN}./deploy.sh --down${RESET}             → stop + clean everything"
echo -e "${BOLD}════════════════════════════════════════════════════${RESET}"

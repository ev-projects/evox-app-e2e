#!/usr/bin/env bash
# run-e2e-with-coverage.sh
# EVOX-29 | Phase 3: Test Environment + Anonymized DB
#
# Orchestrates Playwright E2E tests alongside PHPUnit backend coverage.
# Run from the evox-app root or from the scripts/ directory.
# See scripts/SETUP.md for one-time installation requirements.

set -euo pipefail

# Load NVM so npx is available in non-interactive SSH sessions
export NVM_DIR="${HOME}/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$REPO_ROOT/server"
CLIENT_DIR="$REPO_ROOT/client"
COVERAGE_DIR="$REPO_ROOT/coverage"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log_sep() { log "────────────────────────────────────────────────────"; }

log "======================================================"
log "  EVOX: E2E + Backend Coverage (EVOX-29)"
log "======================================================"
log "Repo root : $REPO_ROOT"
log "Server    : $SERVER_DIR"
log "Client    : $CLIENT_DIR"
log "Coverage  : $COVERAGE_DIR"
log_sep

# ── Clean previous artifacts ──────────────────────────────────────────────────
log "Cleaning previous coverage artifacts..."
rm -rf \
    "$COVERAGE_DIR/html" \
    "$COVERAGE_DIR/clover.xml" \
    "$COVERAGE_DIR/phpunit-coverage.php" \
    "$COVERAGE_DIR/phpunit.log" \
    "$COVERAGE_DIR/playwright-report" \
    "$COVERAGE_DIR/playwright-results.xml" \
    "$COVERAGE_DIR/playwright.log"

mkdir -p "$COVERAGE_DIR"

# ── Playwright E2E ────────────────────────────────────────────────────────────
log "Step 1/1: Running Playwright E2E tests..."
cd "$CLIENT_DIR"

if ! command -v npx &>/dev/null; then
    log "ERROR: npx not found. Node.js ≥14 is required."
    exit 1
fi

# if [ ! -d "node_modules/@playwright" ]; then
if [ ! -d "node_modules/@playwright/test" ]; then
    log "WARN: Playwright not installed. Run 'npm install && npx playwright install chromium' in client/."
    log "      See scripts/SETUP.md for details."
    exit 1
fi

# Use node v18 directly — system node (v12) is too old for Playwright
NODE18="$NVM_DIR/versions/node/v18.20.8/bin/node"
[ ! -f "$NODE18" ] && NODE18="$(which node)"

curl https://evoxtest.eastvantage.com/server/coverage-start.php
# curl http://127.0.0.1:8000/coverage-start.php

# "$NODE18" node_modules/.bin/playwright test \
#     --config=playwright.config.ts \
npx playwright test \
    --config=playwright.config.ts \
    2>&1 | tee "$COVERAGE_DIR/playwright.log"

curl https://evoxtest.eastvantage.com/server/coverage-stop.php
# curl http://127.0.0.1:8000/coverage-stop.php

log "Playwright: complete."
log_sep

log_sep
log "Done."
log "  E2E HTML     : $COVERAGE_DIR/playwright-report/index.html"
log "  E2E XML      : $COVERAGE_DIR/playwright-results.xml"

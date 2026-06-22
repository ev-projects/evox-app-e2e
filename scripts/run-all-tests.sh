#!/usr/bin/env bash
# run-all-tests.sh
# EVOX-29 | Phase 3: Test Environment + Anonymized DB
#
# Master test orchestrator. Runs in sequence:
#   1. PHPUnit  — backend unit + feature tests (with PCOV coverage if available)
#   2. Playwright — E2E tests against the running frontend
#   3. Jest      — frontend unit/component tests (via react-scripts)
#
# Then merges PHP coverage and prints a consolidated summary.
# Exit code: 0 = all suites passed, 1 = one or more suites failed.
#
# See scripts/SETUP.md for one-time installation requirements.

set -uo pipefail   # do NOT use -e so we can collect failures per-suite

# Load NVM so npx is available in non-interactive SSH sessions
export NVM_DIR="${HOME}/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SERVER_DIR="$REPO_ROOT/server"
CLIENT_DIR="$REPO_ROOT/client"
COVERAGE_DIR="$REPO_ROOT/coverage"

FAILED_SUITES=()

log()     { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
log_sep() { log "────────────────────────────────────────────────────"; }
log_ok()  { log "  ✓ $*"; }
log_err() { log "  ✗ $*"; }

log "======================================================"
log "  EVOX Full Test Suite Runner  (EVOX-29)"
log "======================================================"
log "Repo root : $REPO_ROOT"
log "Coverage  : $COVERAGE_DIR"
log_sep

mkdir -p "$COVERAGE_DIR"

# ── 1. PHPUnit — backend ──────────────────────────────────────────────────────
log ""
log "Step 1/3: PHPUnit (Backend)"
log_sep

cd "$SERVER_DIR"

PHPUNIT_CMD="./vendor/bin/phpunit"
if [ ! -f "$PHPUNIT_CMD" ]; then
    log_err "PHPUnit not found — run 'composer install' in server/"
    FAILED_SUITES+=("PHPUnit (composer not installed)")
else
    if php -m | grep -qi pcov; then
        log "PCOV detected — collecting coverage."
        COVERAGE_FLAGS="--coverage-php $COVERAGE_DIR/phpunit-coverage.php --coverage-clover $COVERAGE_DIR/clover.xml --log-junit $COVERAGE_DIR/phpunit-results.xml"
    else
        log "WARN: PCOV not loaded — running PHPUnit without coverage (see SETUP.md)."
        COVERAGE_FLAGS="--log-junit $COVERAGE_DIR/phpunit-results.xml"
    fi

    # shellcheck disable=SC2086
    if $PHPUNIT_CMD $COVERAGE_FLAGS 2>&1 | tee "$COVERAGE_DIR/phpunit.log"; then
        log_ok "PHPUnit PASSED"
    else
        log_err "PHPUnit FAILED"
        FAILED_SUITES+=("PHPUnit")
    fi
fi

# ── 2. Playwright — E2E ───────────────────────────────────────────────────────
log ""
log "Step 2/3: Playwright (E2E)"
log_sep

cd "$CLIENT_DIR"

if ! command -v npx &>/dev/null; then
    log_err "npx not found — Node.js ≥14 required"
    FAILED_SUITES+=("Playwright (Node.js missing)")
elif [ ! -d "node_modules/@playwright" ]; then
    log_err "Playwright not installed — run 'npm install && npx playwright install chromium' in client/"
    FAILED_SUITES+=("Playwright (not installed)")
else
    # Use node v18 directly — system node (v12) is too old for Playwright
    NODE18="$NVM_DIR/versions/node/v18.20.8/bin/node"
    [ ! -f "$NODE18" ] && NODE18="$(which node)"
    log "PLAYWRIGHT_BASE_URL=${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
    if "$NODE18" node_modules/.bin/playwright test --config=playwright.config.ts 2>&1 | tee "$COVERAGE_DIR/playwright.log"; then
        log_ok "Playwright PASSED"
    else
        log_err "Playwright FAILED"
        FAILED_SUITES+=("Playwright")
    fi
fi

# ── 3. Jest — frontend ────────────────────────────────────────────────────────
log ""
log "Step 3/3: Jest (Frontend — react-scripts)"
log_sep

cd "$CLIENT_DIR"

if [ ! -d "node_modules/.bin" ]; then
    log_err "node_modules not found — run 'npm install' in client/"
    FAILED_SUITES+=("Jest (npm not installed)")
else
    JEST_EXIT=0
    CI=true "$NODE18" node_modules/.bin/react-scripts test \
            --coverage \
            --coverageDirectory="$COVERAGE_DIR/jest" \
            --watchAll=false \
            --forceExit \
            2>&1 | tee "$COVERAGE_DIR/jest.log" || JEST_EXIT=$?
    # Exit code 1 with "No tests found" is not a real failure — React tests not written yet (EVOX-36)
    if [ "$JEST_EXIT" -eq 0 ]; then
        log_ok "Jest PASSED"
    elif grep -q "No tests found\|0 matches" "$COVERAGE_DIR/jest.log" 2>/dev/null; then
        log "WARN: Jest — no test files found yet. Add React tests (EVOX-36) to cover frontend."
        log_ok "Jest SKIPPED (no test files)"
    else
        log_err "Jest FAILED"
        FAILED_SUITES+=("Jest")
    fi
fi

# ── Coverage merge (backend) ──────────────────────────────────────────────────
log ""
log "Merging backend coverage..."
log_sep

if [ -f "$COVERAGE_DIR/phpunit-coverage.php" ]; then
    if php "$SCRIPT_DIR/merge-coverage.php"; then
        log_ok "Coverage merge complete"
    else
        log_err "Coverage merge failed (reports may be incomplete)"
    fi
else
    log "Coverage merge skipped — no PCOV data collected."
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log ""
log "======================================================"
log "                  TEST SUMMARY"
log "======================================================"

if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
    log_ok "All suites PASSED"
    log ""
    log "Coverage reports:"
    log "  Backend HTML   : $COVERAGE_DIR/html/index.html"
    log "  Backend Clover : $COVERAGE_DIR/clover.xml"
    log "  Backend JUnit  : $COVERAGE_DIR/phpunit-results.xml"
    log "  E2E HTML       : $COVERAGE_DIR/playwright-report/index.html"
    log "  E2E JUnit      : $COVERAGE_DIR/playwright-results.xml"
    log "  Frontend HTML  : $COVERAGE_DIR/jest/lcov-report/index.html"
    exit 0
else
    log ""
    log_err "Failed suites:"
    for suite in "${FAILED_SUITES[@]}"; do
        log_err "  - $suite"
    done
    log ""
    log "Check logs in: $COVERAGE_DIR/"
    exit 1
fi

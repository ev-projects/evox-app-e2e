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
NON_BLOCKING_ISSUES=()
if [ ! -f "$PHPUNIT_CMD" ]; then
    log_err "PHPUnit not found — run 'composer install' in server/"
    FAILED_SUITES+=("PHPUnit (composer not installed)")
else
    if php -m | grep -qi pcov; then
        log "PCOV detected — collecting coverage."
        COVERAGE_FLAGS="--coverage-php $COVERAGE_DIR/phpunit-coverage.php --coverage-clover $COVERAGE_DIR/clover.xml --log-junit $COVERAGE_DIR/phpunit-results.xml"
    elif php -m | grep -qi xdebug; then
        log "Xdebug detected — collecting coverage (slower than PCOV, expected on this PHP 7.4 install)."
        COVERAGE_FLAGS="--coverage-php $COVERAGE_DIR/phpunit-coverage.php --coverage-clover $COVERAGE_DIR/clover.xml --log-junit $COVERAGE_DIR/phpunit-results.xml"
    else
        log "WARN: no coverage driver (pcov/xdebug) loaded — running PHPUnit without coverage (see SETUP.md)."
        COVERAGE_FLAGS="--log-junit $COVERAGE_DIR/phpunit-results.xml"
    fi

    # Full suite always runs, for coverage + full visibility into every test.
    # Its own exit code does NOT by itself block deploy — see the critical-path
    # re-check right below. (EVOX-18 policy: deploy blocks only on a real
    # work-stopping issue — payroll/DTR/auth — not on every failure across the
    # full ~4100-test suite. See server/phpunit-critical.xml for the exact
    # critical-path list and scripts/SETUP.md for the reasoning.)
    # shellcheck disable=SC2086
    $PHPUNIT_CMD $COVERAGE_FLAGS 2>&1 | tee "$COVERAGE_DIR/phpunit.log"
    PHPUNIT_FULL_EXIT=${PIPESTATUS[0]}

    # Critical-path re-check — THIS exit code is what actually gates deploy.
    # Small subset (payroll calc, DTR/attendance writes, auth), no coverage
    # flags needed, so it's fast even though it re-runs those tests.
    PHPUNIT_CRITICAL_EXIT=0
    if [ -f "phpunit-critical.xml" ]; then
        $PHPUNIT_CMD --configuration phpunit-critical.xml 2>&1 | tee "$COVERAGE_DIR/phpunit-critical.log"
        PHPUNIT_CRITICAL_EXIT=${PIPESTATUS[0]}
    else
        log_err "phpunit-critical.xml missing — cannot verify the critical path, treating as a blocking failure"
        PHPUNIT_CRITICAL_EXIT=1
    fi

    if [ "$PHPUNIT_CRITICAL_EXIT" -ne 0 ]; then
        log_err "PHPUnit FAILED — critical path (payroll/attendance/auth) has a real failure. Blocking deploy."
        FAILED_SUITES+=("PHPUnit (critical path — see $COVERAGE_DIR/phpunit-critical.log)")
    elif [ "$PHPUNIT_FULL_EXIT" -ne 0 ]; then
        log "WARN: PHPUnit — non-critical test(s) failed in the full suite. Not blocking deploy, but needs follow-up."
        NON_BLOCKING_ISSUES+=("PHPUnit (non-critical failures — see $COVERAGE_DIR/phpunit.log)")
        log_ok "PHPUnit PASSED (critical path clean)"
    else
        log_ok "PHPUnit PASSED"
    fi
fi

# ── 2. Playwright — E2E ───────────────────────────────────────────────────────
log ""
log "Step 2/3: Playwright (E2E)"
log_sep

cd "$CLIENT_DIR"

# Temporarily disabled by default (2026-09-03) — 15 real role/geo logins against
# live staging plus full E2E specs was the dominant chunk of CI wall time,
# dwarfing PHPUnit+coverage and Jest combined. Set RUN_PLAYWRIGHT=true (as a
# step env in ci.yml, or in your shell before running this script locally) to
# turn it back on the moment E2E coverage is actually needed again — nothing
# below is deleted, just gated.
RUN_PLAYWRIGHT="${RUN_PLAYWRIGHT:-false}"

if [ "$RUN_PLAYWRIGHT" != "true" ]; then
    log "SKIPPED — Playwright disabled (set RUN_PLAYWRIGHT=true to re-enable)"
elif ! command -v npx &>/dev/null; then
    log_err "npx not found — Node.js ≥14 required"
    FAILED_SUITES+=("Playwright (Node.js missing)")
elif [ ! -d "node_modules/@playwright" ]; then
    log_err "Playwright not installed — run 'npm install && npx playwright install chromium' in client/"
    FAILED_SUITES+=("Playwright (not installed)")
else
    # Use node v18 directly — system node (v12) is too old for Playwright
    NODE18="$NVM_DIR/versions/node/v18.20.8/bin/node"
    [ ! -f "$NODE18" ] && NODE18="$(which node)"
    # Put node 18's dir first on PATH and EXECUTE the bin shim directly, rather
    # than passing it as an argument to node ("$NODE18" node_modules/.bin/...).
    # node_modules/.bin/playwright is sometimes a POSIX shell wrapper (shebang
    # #!/bin/sh, with its own `exec node ...` fallback logic) and sometimes a
    # plain `#!/usr/bin/env node` JS file, depending on the npm version that
    # generated it - either way it's meant to be run as its own executable,
    # not fed to a specific node binary as a script argument. Doing the latter
    # made node try to parse the shell-wrapper form as JavaScript and crash
    # with "SyntaxError: missing ) after argument list" - only ever discovered
    # once a run got far enough to reach this step (previously always blocked
    # earlier by DB config errors). Exporting PATH here, rather than only
    # invoking $NODE18 directly, is what lets either shim style still resolve
    # to v18 internally.
    export PATH="$(dirname "$NODE18"):$PATH"
    chmod +x node_modules/.bin/playwright 2>/dev/null || true
    # Note: playwright.config.ts loads client/.env.e2e itself via dotenv, so this
    # only reflects this shell's own env var (usually unset) — not what Playwright
    # actually uses. Logged for visibility only, not a config source of truth.
    log "PLAYWRIGHT_BASE_URL (shell env, informational only)=${PLAYWRIGHT_BASE_URL:-<unset — see client/.env.e2e>}"
    if node_modules/.bin/playwright test --config=playwright.config.ts 2>&1 | tee "$COVERAGE_DIR/playwright.log"; then
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
    # Same fix as the Playwright step above: execute the bin shim directly
    # rather than passing it to a specific node binary as an argument. PATH
    # already has node 18's dir first (exported in the Playwright step).
    chmod +x node_modules/.bin/react-scripts 2>/dev/null || true
    CI=true node_modules/.bin/react-scripts test \
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
    log_ok "All blocking checks PASSED — critical path (payroll/attendance/auth) is clean"
    if [ ${#NON_BLOCKING_ISSUES[@]} -gt 0 ]; then
        log ""
        log "Non-blocking issues (does NOT block deploy — needs follow-up):"
        for issue in "${NON_BLOCKING_ISSUES[@]}"; do
            log "  - $issue"
        done
    fi
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

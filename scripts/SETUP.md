# EVOX Test Automation — Setup Guide

EVOX-29 | Phase 3: Test Environment + Anonymized DB

---

## Prerequisites

### 1. PHP extension: PCOV or Xdebug (backend coverage driver)

PCOV is a faster alternative to Xdebug for PHP code coverage, and PHPUnit 7 detects it automatically when loaded.

> **This project's PHP 7.4 CI runner uses Xdebug instead of PCOV** — PCOV is not supported on that install. `run-all-tests.sh` detects either driver automatically (PCOV first, falling back to Xdebug) and passes the same `--coverage-php`/`--coverage-clover` flags either way; no script changes are needed to switch drivers. If using Xdebug, set in `php.ini`:
> ```ini
> xdebug.mode = coverage,debug,develop
> memory_limit = 1G
> ```
> (`develop` mode avoids a secondary Xdebug error when reporting fatals; `1G` avoids memory exhaustion — Xdebug's coverage instrumentation uses noticeably more memory than PCOV's.)

**Ubuntu / Debian:**
```bash
sudo apt-get install -y php7.4-dev php-pear
sudo pecl install pcov
# Add to PHP CLI ini (path varies by distro):
echo "extension=pcov.so" | sudo tee -a /etc/php/7.4/cli/conf.d/20-pcov.ini
echo "pcov.enabled=1"    | sudo tee -a /etc/php/7.4/cli/conf.d/20-pcov.ini
```

**macOS (Homebrew PHP 7.4):**
```bash
pecl install pcov
# Locate your CLI php.ini:
php --ini | grep "Loaded Configuration"
# Then add:  extension=pcov.so  and  pcov.enabled=1
```

**Docker (add to your PHP 7.4 Dockerfile):**
```dockerfile
RUN pecl install pcov && docker-php-ext-enable pcov \
    && echo "pcov.enabled=1" >> /usr/local/etc/php/conf.d/docker-php-ext-pcov.ini
```

**Verify:**
```bash
php -m | grep pcov
# Should output: pcov
```

> If PCOV is not available, tests still run — coverage reports are simply skipped.

---

### 2. Playwright browsers (E2E tests)

Playwright downloads its own browser binaries separately from npm.

```bash
cd client
npm install                    # installs @playwright/test
npx playwright install chromium  # downloads Chromium binary (~150 MB)
```

**Node.js requirement:** Playwright requires Node.js ≥ 14. Verify:
```bash
node --version   # must be v14.0.0 or higher
```

---

### 3. PHP Composer dependencies

```bash
cd server
composer install
```

---

## Running the test suite

### Full suite (one command)
```bash
# From the evox-app root:
chmod +x scripts/run-all-tests.sh scripts/run-e2e-with-coverage.sh
./scripts/run-all-tests.sh
```

### E2E + coverage only
```bash
./scripts/run-e2e-with-coverage.sh
```

### Backend only (PHPUnit)
```bash
cd server
PCOV_ENABLED=1 ./vendor/bin/phpunit
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PLAYWRIGHT_BASE_URL` | `http://localhost:3000` | Frontend URL for Playwright tests |
| `APP_ENV` | `testing` | Laravel environment for PHPUnit (set in phpunit.xml) |
| `DB_DATABASE` | *(from .env)* | Use a dedicated test DB — never point at production |

Export before running, or create a `.env.test` and source it:
```bash
export PLAYWRIGHT_BASE_URL=https://evoxtest.eastvantage.com
./scripts/run-all-tests.sh
```

---

## Coverage output locations

After a full run, reports are written to `evox-app/coverage/`:

| Path | Content |
|---|---|
| `coverage/html/index.html` | PHP backend coverage (HTML) |
| `coverage/clover.xml` | PHP backend coverage (Clover XML — for CI) |
| `coverage/phpunit-results.xml` | PHPUnit JUnit results |
| `coverage/playwright-report/index.html` | Playwright E2E HTML report |
| `coverage/playwright-results.xml` | Playwright JUnit results (for CI) |
| `coverage/jest/lcov-report/index.html` | Jest frontend coverage (HTML) |

---

## Deploy gate: critical-path tests only (EVOX-18)

A full run of the backend suite is ~4100 tests. Requiring every single one to
pass before every deploy isn't realistic long-term (legacy tests, flaky
edge cases, environment-dependent behaviour) — but silently ignoring
failures isn't acceptable either. The policy here is deliberately **not** a
pass-rate percentage (an "85% passing" threshold can't tell a payroll bug
apart from a cosmetic one — it would let the former through exactly as
easily as the latter). Instead:

- **`server/phpunit-critical.xml`** lists the tests that cover payroll
  calculations, DTR/attendance writes, and authentication/authorization —
  the paths where wrong output has real financial, legal, or security
  consequences. `run-all-tests.sh` re-runs just this subset after the full
  suite, and **only a failure here blocks deploy**.
- A failure anywhere else in the full suite is still run, still logged, and
  still shown in the summary as a **non-blocking issue** — visible, tracked,
  expected to get fixed — but it does not hold up a deploy on its own.
- Adding a test to the critical list is a deliberate edit someone makes to
  `phpunit-critical.xml`, reviewed like any other change — not automatic,
  and not a number that can silently drift.

## Phase 6 — GitHub Actions

These scripts are structured for direct use in GitHub Actions:

- All paths are relative to the repo root (no hardcoded local paths)
- Coverage artifacts are in a single `coverage/` directory (easy to upload)
- Exit codes: `run-all-tests.sh` exits `1` only if a *blocking* check fails
  (critical-path PHPUnit, Playwright, or Jest) — non-critical PHPUnit
  failures are reported but exit `0`. See "Deploy gate" above.
- JUnit XML files are compatible with GitHub Actions test reporting

See EVOX-18 (Epic) for the Phase 6 CI configuration ticket.

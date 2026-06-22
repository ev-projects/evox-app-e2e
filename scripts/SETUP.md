# EVOX Test Automation — Setup Guide

EVOX-29 | Phase 3: Test Environment + Anonymized DB

---

## Prerequisites

### 1. PHP extension: PCOV (backend coverage driver)

PCOV is a faster alternative to Xdebug for PHP code coverage. PHPUnit 7 detects it automatically when loaded.

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

## Phase 6 — GitHub Actions

These scripts are structured for direct use in GitHub Actions:

- All paths are relative to the repo root (no hardcoded local paths)
- Coverage artifacts are in a single `coverage/` directory (easy to upload)
- Exit codes: scripts exit `1` on any test failure, `0` on all-pass
- JUnit XML files are compatible with GitHub Actions test reporting

See EVOX-18 (Epic) for the Phase 6 CI configuration ticket.

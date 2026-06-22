<?php
/**
 * merge-coverage.php
 * EVOX-29 | Phase 3: Test Environment + Anonymized DB
 *
 * Merges PHPUnit coverage sources into unified HTML and Clover XML reports.
 * Uses php-code-coverage v6 (bundled with PHPUnit 7, already in server/vendor).
 *
 * Usage (called automatically by the shell scripts):
 *   php scripts/merge-coverage.php
 *
 * Input:  coverage/phpunit-coverage.php  (serialised CodeCoverage object)
 * Output: coverage/html/index.html       (HTML report)
 *         coverage/clover.xml            (Clover XML for CI)
 */

declare(strict_types=1);

// Load PHPUnit's autoloader — provides SebastianBergmann\CodeCoverage classes.
$autoloader = __DIR__ . '/../server/vendor/autoload.php';
if (!file_exists($autoloader)) {
    fwrite(STDERR, "[merge-coverage] ERROR: vendor/autoload.php not found.\n");
    fwrite(STDERR, "  Run 'composer install' in server/ first.\n");
    exit(1);
}
require_once $autoloader;

use SebastianBergmann\CodeCoverage\CodeCoverage;
use SebastianBergmann\CodeCoverage\Report\Html\Facade as HtmlReport;
use SebastianBergmann\CodeCoverage\Report\Clover as CloverReport;

$repoRoot       = dirname(__DIR__);
$coverageDir    = $repoRoot . '/coverage';
$primaryFile    = $coverageDir . '/phpunit-coverage.php';
$htmlOutput     = $coverageDir . '/html';
$cloverOutput   = $coverageDir . '/clover.xml';

// ── Load primary coverage source ──────────────────────────────────────────────
if (!file_exists($primaryFile)) {
    fwrite(STDERR, "[merge-coverage] No coverage data found at: $primaryFile\n");
    fwrite(STDERR, "  Run PHPUnit with --coverage-php to generate it.\n");
    exit(1);
}

echo "[merge-coverage] Loading coverage data from $primaryFile ...\n";

/** @var CodeCoverage $coverage */
$coverage = require $primaryFile;

if (!$coverage instanceof CodeCoverage) {
    fwrite(STDERR, "[merge-coverage] ERROR: $primaryFile did not return a CodeCoverage object.\n");
    fwrite(STDERR, "  Expected: SebastianBergmann\\CodeCoverage\\CodeCoverage\n");
    fwrite(STDERR, "  Got     : " . get_class($coverage) . "\n");
    exit(1);
}

// ── Merge additional sources (extend here as more test types are added) ───────
// Example: $extra = require $coverageDir . '/integration-coverage.php';
//          $coverage->merge($extra);
$coverageFiles = glob($coverageDir . '/*.php');
foreach ($coverageFiles as $file) {

    // skip primary file itself
    if ($file === $primaryFile) {
        continue;
    }

    $extra = require $file;

    if (!$extra instanceof CodeCoverage) {
        fwrite(STDERR, "[merge-coverage] Skipping invalid file: $file\n");
        continue;
    }

    try {
        $coverage->merge($extra);
        fwrite(STDOUT, "[merge-coverage] merged: $file\n");
    } catch (Throwable $e) {
        fwrite(STDERR, "[merge-coverage] failed to merge $file: " . $e->getMessage() . "\n");
    }
}

// ── Generate HTML report ──────────────────────────────────────────────────────
echo "[merge-coverage] Writing HTML report -> $htmlOutput\n";
if (!is_dir($htmlOutput) && !mkdir($htmlOutput, 0755, true) && !is_dir($htmlOutput)) {
    fwrite(STDERR, "[merge-coverage] ERROR: Cannot create directory: $htmlOutput\n");
    exit(1);
}

$htmlReport = new HtmlReport();
$htmlReport->process($coverage, $htmlOutput);

// ── Generate Clover XML ───────────────────────────────────────────────────────
echo "[merge-coverage] Writing Clover XML -> $cloverOutput\n";
$cloverDir = dirname($cloverOutput);
if (!is_dir($cloverDir) && !mkdir($cloverDir, 0755, true) && !is_dir($cloverDir)) {
    fwrite(STDERR, "[merge-coverage] ERROR: Cannot create directory: $cloverDir\n");
    exit(1);
}

$cloverReport = new CloverReport();
$cloverReport->process($coverage, $cloverOutput);

echo "[merge-coverage] Done.\n";
echo "[merge-coverage]   HTML  : $htmlOutput/index.html\n";
echo "[merge-coverage]   Clover: $cloverOutput\n";

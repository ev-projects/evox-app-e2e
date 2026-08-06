<?php
/**
 * evoxtest_merge_coverage.php
 *
 * Merges two PHPUnit coverage-php (.cov) files produced by the split runs
 * (evoxtest_phpunit_part1.xml + evoxtest_phpunit_part2.xml) and outputs:
 *   - Final clover XML
 *   - Final HTML report
 *   - Console summary (matches evoxtest_phpunit.xml text output)
 *
 * Run from server/ directory:
 *   php generated/evoxtest_merge_coverage.php
 */

ini_set('memory_limit', '4G');

define('SERVER_DIR', __DIR__ . '/..');
define('COV_PART1', 'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\PS-main\\PS-main\\.evox-test-backend\\generated\\evoxtest_coverage_part1.cov');
define('COV_PART2', 'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\PS-main\\PS-main\\.evox-test-backend\\generated\\evoxtest_coverage_part2.cov');
define('OUT_CLOVER', 'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\PS-main\\PS-main\\.evox-test-backend\\generated\\evoxtest_coverage_clover.xml');
define('OUT_HTML',   'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\Gary & Glenn Report\\evoxtest_final-report\\backend');

require SERVER_DIR . '/vendor/autoload.php';

// ── Load both .cov files ──────────────────────────────────────────────────────
echo "Loading part 1 coverage...\n";
if (!file_exists(COV_PART1)) {
    echo "ERROR: part1.cov not found at: " . COV_PART1 . "\n";
    exit(1);
}
$coverage1 = include COV_PART1;

echo "Loading part 2 coverage...\n";
if (!file_exists(COV_PART2)) {
    echo "ERROR: part2.cov not found at: " . COV_PART2 . "\n";
    exit(1);
}
$coverage2 = include COV_PART2;

// ── Merge ─────────────────────────────────────────────────────────────────────
echo "Merging...\n";
$coverage1->merge($coverage2);

// ── Clover XML ───────────────────────────────────────────────────────────────
echo "Writing clover XML to: " . OUT_CLOVER . "\n";
$cloverWriter = new SebastianBergmann\CodeCoverage\Report\Clover();
$cloverWriter->process($coverage1, OUT_CLOVER);

// ── HTML report ───────────────────────────────────────────────────────────────
echo "Writing HTML report to: " . OUT_HTML . "\n";
$htmlWriter = new SebastianBergmann\CodeCoverage\Report\Html\Facade();
$htmlWriter->process($coverage1, OUT_HTML);

// ── Console text summary ──────────────────────────────────────────────────────
echo "\n";
$textWriter = new SebastianBergmann\CodeCoverage\Report\Text(
    50,   // lowUpperBound
    90,   // highLowerBound
    false, // showUncoveredFiles
    false  // showOnlySummary
);
echo $textWriter->process($coverage1, true);

echo "\nDone. HTML report: " . OUT_HTML . "\n";
echo "Clover XML:        " . OUT_CLOVER . "\n";

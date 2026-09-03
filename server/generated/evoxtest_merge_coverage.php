<?php
/**
 * EVOX Coverage Merge Script
 * Merges part1.cov + part2.cov → final clover XML + HTML report
 *
 * Run from: C:\DFolder\Projects\EVOX\E2eTesting\EVOX Code-Git\evox-app-e2e\server\
 * Command:  php generated/evoxtest_merge_coverage.php
 */

$coverageDir = 'C:\\DFolder\\Projects\\EVOX\\E2eTesting\\VishnuTestCases\\EVOX-TEST-SUITE-FULL-2026-07-28\\Coverage';
$part1File   = $coverageDir . '\\evoxtest_coverage_part1.cov';
$part2File   = $coverageDir . '\\evoxtest_coverage_part2.cov';
$cloverOut   = $coverageDir . '\\evoxtest_coverage_clover_backend.xml';
$htmlOut     = $coverageDir . '\\backend';

// ── Verify both .cov files exist ─────────────────────────────────────────────
foreach ([$part1File, $part2File] as $f) {
    if (!file_exists($f)) {
        echo "ERROR: coverage file not found: $f\n";
        echo "Run part1 and part2 phpunit configs before merging.\n";
        exit(1);
    }
}

echo "Loading part1 coverage...\n";
/** @var SebastianBergmann\CodeCoverage\CodeCoverage $coverage */
$coverage = require $part1File;

echo "Loading part2 coverage...\n";
/** @var SebastianBergmann\CodeCoverage\CodeCoverage $coverage2 */
$coverage2 = require $part2File;

echo "Merging...\n";
$coverage->merge($coverage2);

// ── Write Clover XML ──────────────────────────────────────────────────────────
echo "Writing clover XML → $cloverOut\n";
$cloverWriter = new SebastianBergmann\CodeCoverage\Report\Clover;
$cloverWriter->process($coverage, $cloverOut);

// ── Write HTML report ─────────────────────────────────────────────────────────
echo "Writing HTML report → $htmlOut\n";
$htmlWriter = new SebastianBergmann\CodeCoverage\Report\Html\Facade;
$htmlWriter->process($coverage, $htmlOut);

echo "\nDone. Coverage report at:\n  $htmlOut\\index.html\n";

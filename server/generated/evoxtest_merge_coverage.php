<?php
/**
 * EVOX Coverage Merge Script
 * Merges part1.cov + part2.cov → final clover XML + HTML report
 *
 * Uses direct getData(true)/setData() union instead of merge() to avoid the
 * isFiltered() realpath-mismatch bug on Windows that silently drops Part 1-only files.
 *
 * Run from: C:\DFolder\Projects\EVOX\E2eTesting\EVOX Code-Git\evox-app-e2e\server\
 * Command:  php -d memory_limit=6G generated/evoxtest_merge_coverage.php
 */

require __DIR__ . '/../vendor/autoload.php';

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

// ── Load both .cov objects ────────────────────────────────────────────────────
echo "Loading part2 coverage (base)...\n";
/** @var SebastianBergmann\CodeCoverage\CodeCoverage $base */
$base = require $part2File;

echo "Loading part1 coverage...\n";
/** @var SebastianBergmann\CodeCoverage\CodeCoverage $other */
$other = require $part1File;

// ── Manual union — bypasses isFiltered() realpath-mismatch on Windows ────────
//
// getLinePriority mirrors the private method in CodeCoverage::merge():
//   1 = key absent  (line not tracked in this run)
//   2 = []          (executable, not covered)
//   3 = null        (not executable / dead)
//   4 = [...]       (covered — non-empty array of test IDs)
//
// Higher priority wins.  Equal priority + both arrays → union test IDs.
echo "Merging part1 data into part2 base (manual union)...\n";

$getPriority = static function (array $lineData, $line): int {
    if (!\array_key_exists($line, $lineData)) {
        return 1;
    }
    if (\is_array($lineData[$line]) && \count($lineData[$line]) === 0) {
        return 2;
    }
    if ($lineData[$line] === null) {
        return 3;
    }
    return 4; // non-empty array = covered
};

$dataBase  = $base->getData(true);   // raw, skip addUncoveredFilesFromWhitelist
$dataOther = $other->getData(true);

foreach ($dataOther as $file => $linesOther) {
    if (!isset($dataBase[$file])) {
        // File only in Part 1 — add entirely regardless of filter
        $dataBase[$file] = $linesOther;
        continue;
    }

    // File in both — merge line-by-line with priority
    $linesBase = $dataBase[$file];
    $allLines  = \array_keys($linesOther + $linesBase); // union of line numbers

    foreach ($allLines as $line) {
        $pOther = $getPriority($linesOther, $line);
        $pBase  = $getPriority($linesBase,  $line);

        if ($pOther > $pBase) {
            $dataBase[$file][$line] = $linesOther[$line];
        } elseif ($pOther === $pBase
               && isset($linesBase[$line])  && \is_array($linesBase[$line])
               && isset($linesOther[$line]) && \is_array($linesOther[$line])) {
            // Both covered — union test IDs
            $dataBase[$file][$line] = \array_unique(
                \array_merge($linesBase[$line], $linesOther[$line])
            );
        }
        // else keep base value (pBase > pOther, or base already optimal)
    }
}

// Push combined data back into the base object
$base->setData($dataBase);

// Union filters and tests
$base->filter()->setWhitelistedFiles(
    \array_merge(
        $base->filter()->getWhitelistedFiles(),
        $other->filter()->getWhitelistedFiles()
    )
);
$base->setTests(\array_merge($base->getTests(), $other->getTests()));

$filesAfter = count($dataBase);
echo "Files in merged data: {$filesAfter}\n";

// ── Write Clover XML ──────────────────────────────────────────────────────────
echo "Writing clover XML → $cloverOut\n";
$cloverWriter = new SebastianBergmann\CodeCoverage\Report\Clover;
$cloverWriter->process($base, $cloverOut);

// ── Write HTML report ─────────────────────────────────────────────────────────
echo "Writing HTML report → $htmlOut\n";
$htmlWriter = new SebastianBergmann\CodeCoverage\Report\Html\Facade;
$htmlWriter->process($base, $htmlOut);

echo "\nDone. Coverage report at:\n  $htmlOut\\index.html\n";

<?php

$threshold = (float) trim(file_get_contents(__DIR__.'/../ci/coverage-threshold.txt'));

$xml = simplexml_load_file(__DIR__.'/../reports/coverage.xml');

$metrics = $xml->project->metrics;

$covered = (int)$metrics['coveredstatements'];
$total = (int)$metrics['statements'];

$coverage = ($covered / $total) * 100;

echo PHP_EOL;
echo "Coverage : ".round($coverage,2)."%".PHP_EOL;
echo "Required : ".$threshold."%".PHP_EOL;

if ($coverage < $threshold) {
    echo PHP_EOL;
    echo "Coverage dropped below threshold.".PHP_EOL;
    exit(1);
}

echo PHP_EOL;
echo "Coverage OK".PHP_EOL;
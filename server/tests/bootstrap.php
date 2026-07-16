<?php

require __DIR__ . '/../vendor/autoload.php';

// Read .env before test class constants are resolved so TestUsers:: constants work
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        if (strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key   = trim($key);
        $value = trim($value);
        if (!getenv($key)) {
            putenv("{$key}={$value}");
        }
    }
}

define('EVOX_E2E_EMPLOYEE_USERNAME', getenv('E2E_USER_EMPLOYEE_PHILIPPINES') ?: '');
define('EVOX_E2E_EMPLOYEE_PASSWORD', getenv('E2E_USER_EMPLOYEE_PHILIPPINES_PASSWORD') ?: '');
<?php
/**
 * evoxtest_check_users.php
 * Run from server/ directory: php evoxtest_check_users.php
 * Checks which E2E test users exist in the dev DB.
 */

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$emails = [
    'EMPLOYEE_PHILIPPINES'   => 'glenn.macasarte@eastvantage.com',
    'SUPERVISOR_PHILIPPINES' => 'gary.aure@eastvantage.com',
    'EMPLOYEE_INDIA'         => 'komal.prasad@unq.eastvantage.com',
    'SUPERVISOR_INDIA'       => 'nidhi.shrivastava@unq.eastvantage.com',
    'EMPLOYEE_MOROCCO'       => 'mariam.elmakrini@unit-t.eastvantage.com',
    'SUPERVISOR_MOROCCO'     => 'hajar.alaoui@eastvantage.com',
    'ADMIN_PHILIPPINES'      => 'dummyman@ops.eastvantage.com',
    'HR_HEAD'                => 'atea.ortiz@eastvantage.com',
    'HR_PHILIPPINES'         => 'alvini.cruz@eastvantage.com',
    'HR_INDIA'               => 'toiba.qureshi@eastvantage.com',
    'HR_MOROCCO'             => 'khaoula.laaraibi@eastvantage.com',
    'PAYROLL_HEAD'           => 'testPayroll@eastvantage.com',
    'PAYROLL_PHILIPPINES'    => 'susan.calderon@eastvantage.com',
    'PAYROLL_INDIA'          => 'niveditha.sathyanarayana@eastvantage.com',
    'PAYROLL_MOROCCO'        => 'testPayrollMAR@eastvantage.com',
];

printf("%-26s %-45s %s\n", 'VARIANT', 'EMAIL', 'STATUS');
echo str_repeat('-', 105) . "\n";

$missing = [];
foreach ($emails as $variant => $email) {
    $user = DB::table('users')->where('email', $email)->first();
    if ($user) {
        printf("%-26s %-45s FOUND  id=%-5d SubDeptID=%-5s LevelId=%s\n",
            $variant, $email, $user->id,
            $user->SubDepartmentID ?? 'null',
            $user->LevelId ?? 'null'
        );
    } else {
        printf("%-26s %-45s *** MISSING ***\n", $variant, $email);
        $missing[] = $variant;
    }
}

echo "\n";
if (empty($missing)) {
    echo "✓ All 15 E2E users found in DB. DATA-SEEDABLE 'unspecified' items should unblock on next run.\n";
} else {
    echo count($missing) . " user(s) MISSING from DB:\n";
    foreach ($missing as $v) echo "  - E2E_USER_$v\n";
    echo "\nThese users must be imported from production before those tests can run.\n";
    echo "Do NOT insert fake rows — import real user records or refresh dev DB from prod dump.\n";
}

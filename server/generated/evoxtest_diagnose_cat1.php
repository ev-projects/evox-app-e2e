<?php
/**
 * evoxtest_diagnose_cat1.php
 * Category-1 / DATA-SEEDABLE diagnostics — "no user in test DB" guards.
 *
 * Run from the server/ directory:
 *   php generated/evoxtest_diagnose_cat1.php
 *
 * Uses the same DB connection as PHPUnit (reads server/.env directly via
 * a raw PDO connection — no Laravel boot required).
 */

// ── 1. Read .env ────────────────────────────────────────────────────────────
$envFile = __DIR__ . '/../.env';
$env = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) continue;
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
}

$host   = $env['DB_HOST']     ?? '127.0.0.1';
$port   = $env['DB_PORT']     ?? '3306';
$db     = $env['DB_DATABASE'] ?? 'evox-app';
$user   = $env['DB_USERNAME'] ?? 'root';
$pass   = $env['DB_PASSWORD'] ?? '';

// ── 2. Connect ───────────────────────────────────────────────────────────────
try {
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (\PDOException $e) {
    echo "❌ CANNOT CONNECT TO DB: {$e->getMessage()}\n";
    exit(1);
}

echo "\n";
echo "═══════════════════════════════════════════════════════\n";
echo "  EVOX — Category-1 Data Diagnostic\n";
echo "  DB: {$db} @ {$host}:{$port}\n";
echo "═══════════════════════════════════════════════════════\n\n";

// ── 3. Generic user probe (BranchTest guard) ─────────────────────────────────
echo "── GENERIC USER PROBE ─────────────────────────────────\n";
$row = $pdo->query("SELECT COUNT(*) AS total FROM users")->fetch();
echo "  users total rows:          {$row['total']}\n";

$row = $pdo->query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1")->fetch();
echo "  users WHERE is_active=1:   {$row['n']}\n";

$row = $pdo->query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1 AND email IS NOT NULL")->fetch();
echo "  + email IS NOT NULL:       {$row['n']}\n";

$row = $pdo->query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1 AND email IS NOT NULL AND country_id > 0")->fetch();
echo "  + country_id > 0:          {$row['n']}\n";

$row = $pdo->query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1 AND email IS NOT NULL AND country_id > 0 AND date_hired IS NOT NULL")->fetch();
echo "  + date_hired IS NOT NULL:  {$row['n']}\n";

$row = $pdo->query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1 AND email IS NOT NULL AND bhr_num IS NOT NULL")->fetch();
echo "  + bhr_num IS NOT NULL:     {$row['n']}\n";

$row = $pdo->query("SELECT COUNT(*) AS n FROM users WHERE is_active = 1 AND email IS NOT NULL AND SubDepartmentID IS NOT NULL AND SubDepartmentID > 0")->fetch();
echo "  + SubDepartmentID > 0:     {$row['n']}\n";

echo "\n";

// ── 4. E2E variant user lookup ────────────────────────────────────────────────
echo "── E2E VARIANT USERS (from .env) ──────────────────────\n";

$variants = [
    'E2E_USER_EMPLOYEE_PHILIPPINES',
    'E2E_USER_SUPERVISOR_PHILIPPINES',
    'E2E_USER_EMPLOYEE_INDIA',
    'E2E_USER_SUPERVISOR_INDIA',
    'E2E_USER_EMPLOYEE_MOROCCO',
    'E2E_USER_SUPERVISOR_MOROCCO',
    'E2E_USER_ADMIN_PHILIPPINES',
    'E2E_USER_HR_HEAD',
    'E2E_USER_HR_PHILIPPINES',
    'E2E_USER_HR_INDIA',
    'E2E_USER_HR_MOROCCO',
    'E2E_USER_PAYROLL_HEAD',
    'E2E_USER_PAYROLL_PHILIPPINES',
    'E2E_USER_PAYROLL_INDIA',
    'E2E_USER_PAYROLL_MOROCCO',
];

$allFound = true;
foreach ($variants as $key) {
    $email = $env[$key] ?? null;
    if (!$email) {
        printf("  ⚠  %-40s  ENV VAR NOT SET\n", $key);
        $allFound = false;
        continue;
    }
    $stmt = $pdo->prepare("SELECT id, is_active, bhr_num, country_id, SubDepartmentID, LevelId FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $u = $stmt->fetch();
    if (!$u) {
        printf("  ❌ %-40s  (%s) — NOT IN DB\n", $key, $email);
        $allFound = false;
    } else {
        $flags = [];
        if (!$u['is_active'])        $flags[] = 'is_active=0';
        if (!$u['bhr_num'])          $flags[] = 'bhr_num=NULL';
        if (!$u['country_id'])       $flags[] = 'country_id=NULL';
        if (!$u['SubDepartmentID'])  $flags[] = 'SubDepartmentID=NULL';
        if (!$u['LevelId'])          $flags[] = 'LevelId=NULL';
        $status = empty($flags) ? '✅ OK' : ('⚠  ' . implode(', ', $flags));
        printf("  %s %-40s  id=%-6d %s\n", empty($flags) ? '✅' : '⚠ ', $key, $u['id'], $status);
        if (!empty($flags)) $allFound = false;
    }
}

echo "\n";
if ($allFound) {
    echo "  ✅ All E2E variant users found with no missing fields.\n";
} else {
    echo "  ❌ One or more E2E variant users are missing or incomplete.\n";
}

// ── 5. Key specific users (Glenn & Gary) ────────────────────────────────────
echo "\n── KEY NAMED USERS ────────────────────────────────────\n";
$named = [
    [1593, 'Glenn Macasarte', 43284],
    [1698, 'Gary Aure',       null],
];
foreach ($named as [$uid, $name, $expectedBhr]) {
    $stmt = $pdo->prepare("SELECT id, is_active, bhr_num, country_id, SubDepartmentID, LevelId FROM users WHERE id = ?");
    $stmt->execute([$uid]);
    $u = $stmt->fetch();
    if (!$u) {
        echo "  ❌ id={$uid} ({$name}) — NOT IN DB\n";
    } else {
        $bhrOk = ($expectedBhr === null || (int)$u['bhr_num'] === $expectedBhr);
        echo "  " . ($u['is_active'] && $bhrOk ? '✅' : '⚠ ')
           . " id={$uid} ({$name}) is_active={$u['is_active']} bhr_num={$u['bhr_num']}"
           . " country_id={$u['country_id']} SubDept={$u['SubDepartmentID']} LevelId={$u['LevelId']}\n";
    }
}

// ── 6. Org-structure tables ──────────────────────────────────────────────────
echo "\n── ORG STRUCTURE TABLES ────────────────────────────────\n";
foreach (['EVOX_DIVISION','EVOX_DEPARTMENT','EVOX_SUB_DEPARTMENT','EVOX_LEVELS'] as $t) {
    try {
        $n = $pdo->query("SELECT COUNT(*) AS n FROM `{$t}`")->fetch()['n'];
        echo "  " . ($n > 0 ? '✅' : '❌') . " {$t}: {$n} rows\n";
    } catch (\Exception $e) {
        echo "  ❌ {$t}: TABLE ERROR — {$e->getMessage()}\n";
    }
}

// ── 7. Key content tables ─────────────────────────────────────────────────────
echo "\n── KEY CONTENT TABLES ──────────────────────────────────\n";
$tables = [
    ['utc_timelog',                 'SELECT COUNT(*) AS n FROM utc_timelog'],
    ['alter_logs (not deleted)',     'SELECT COUNT(*) AS n FROM alter_logs WHERE deleted_at IS NULL'],
    ['alter_logs (approved+times)', 'SELECT COUNT(*) AS n FROM alter_logs WHERE status="approved" AND new_time_in IS NOT NULL AND new_time_out IS NOT NULL AND deleted_at IS NULL'],
    ['overtimes (not deleted)',      'SELECT COUNT(*) AS n FROM overtimes WHERE deleted_at IS NULL'],
    ['rest_day_work (approved)',     'SELECT COUNT(*) AS n FROM rest_day_work WHERE status="approved"'],
    ['schedules (template)',         'SELECT COUNT(*) AS n FROM schedules WHERE source_type="template" AND deleted_at IS NULL'],
    ['schedules (default)',          'SELECT COUNT(*) AS n FROM schedules WHERE source_type="default" AND deleted_at IS NULL'],
    ['schedule_details',             'SELECT COUNT(*) AS n FROM schedule_details'],
    ['schedule_policies',            'SELECT COUNT(*) AS n FROM schedule_policies'],
    ['dtrs (valid time_in+out)',     'SELECT COUNT(*) AS n FROM dtrs WHERE time_in IS NOT NULL AND time_out > 0'],
    ['payroll_cutoffs',              'SELECT COUNT(*) AS n FROM payroll_cutoffs WHERE deleted_at IS NULL'],
    ['predefined_holidays',          'SELECT COUNT(*) AS n FROM predefined_holidays'],
    ['announcements',                'SELECT COUNT(*) AS n FROM announcements'],
    ['announcements (creator!=0)',   'SELECT COUNT(*) AS n FROM announcements WHERE created_by != 0'],
    ['employee_clients',             'SELECT COUNT(*) AS n FROM employee_clients'],
    ['change_schedules (any)',       'SELECT COUNT(*) AS n FROM change_schedules WHERE deleted_at IS NULL'],
    ['asset_management (active)',    'SELECT COUNT(*) AS n FROM asset_management WHERE deleted_at IS NULL'],
    ['nho_survey',                   'SELECT COUNT(*) AS n FROM nho_survey'],
    ['ops_schedules',                'SELECT COUNT(*) AS n FROM ops_schedules'],
    ['dtr_policies',                 'SELECT COUNT(*) AS n FROM dtr_policies'],
    ['dtr_collective_punch_history_new', 'SELECT COUNT(*) AS n FROM dtr_collective_punch_history_new'],
    ['alter_log_punches_new',        'SELECT COUNT(*) AS n FROM alter_log_punches_new'],
    ['roles',                        'SELECT COUNT(*) AS n FROM roles'],
    ['permissions',                  'SELECT COUNT(*) AS n FROM permissions'],
    ['EVOX_IND_PAYROLL_CUTOFF',      'SELECT COUNT(*) AS n FROM EVOX_IND_PAYROLL_CUTOFF'],
];

foreach ($tables as [$label, $sql]) {
    try {
        $n = $pdo->query($sql)->fetch()['n'];
        echo "  " . ($n > 0 ? '✅' : '❌') . " {$label}: {$n}\n";
    } catch (\Exception $e) {
        echo "  ❌ {$label}: {$e->getMessage()}\n";
    }
}

// ── 8. Roles check (supervisor, admin, employee) ──────────────────────────────
echo "\n── ROLES ───────────────────────────────────────────────\n";
try {
    $rows = $pdo->query("SELECT name, guard_name FROM roles ORDER BY name")->fetchAll();
    if (empty($rows)) {
        echo "  ❌ No roles in DB\n";
    } else {
        foreach ($rows as $r) {
            echo "  ✅ '{$r['name']}' (guard: {$r['guard_name']})\n";
        }
    }
} catch (\Exception $e) {
    echo "  ❌ roles table error: {$e->getMessage()}\n";
}

// ── 9. EVOX_LEVELS check ─────────────────────────────────────────────────────
echo "\n── EVOX_LEVELS ────────────────────────────────────────\n";
try {
    $rows = $pdo->query("SELECT Id, Name FROM EVOX_LEVELS ORDER BY Id LIMIT 20")->fetchAll();
    if (empty($rows)) {
        echo "  ❌ EVOX_LEVELS is empty\n";
    } else {
        foreach ($rows as $r) {
            echo "  ✅ Id={$r['Id']} Name={$r['Name']}\n";
        }
    }
} catch (\Exception $e) {
    echo "  ❌ EVOX_LEVELS error: {$e->getMessage()}\n";
}

echo "\n═══════════════════════════════════════════════════════\n";
echo "  Run complete. Share the output above.\n";
echo "═══════════════════════════════════════════════════════\n\n";

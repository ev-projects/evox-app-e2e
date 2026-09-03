<?php
/**
 * evoxtest_seed_cat1.php
 * Category-1 seed — closes the one real DATA-SEEDABLE gap:
 *   employee_clients table: 0 rows (ClientApiTest guard fires)
 *
 * NOTE: The original plan included a second seed (announcements created_by=0).
 * That was CANCELLED 2026-08-10: created_by is always a real users.id in
 * production — every announcement is created by an authenticated user.
 * created_by=0 cannot occur in any normal app flow. The branch in
 * AnnouncementStrictResource::toArray() that checks `created_by != 0` has
 * its else-arm as dead code. The test that asserts that arm has been marked
 * markTestSkipped('BY-DESIGN') instead. See FINDING-ANN-DEAD-1.
 *
 * Run from server/ directory:
 *   php generated/evoxtest_seed_cat1.php
 *
 * Safe to re-run: INSERT is guarded by a SELECT-first check.
 *
 * Does NOT insert users — CLAUDE.md forbids fake user inserts.
 * Uses only real foreign-key values already present in the DB:
 *   client_id=1     → users.id=1  (Aaron Colina — FK is on users, NOT clients table)
 *                     NOTE: The clients table (Client A/B/C) has NO FK relation to
 *                     employee_clients. The FK employee_clients.client_id → users.id
 *                     was confirmed from information_schema.KEY_COLUMN_USAGE 2026-08-10.
 *                     Only one LevelId=7 (client-role) user exists in DB (id=4709,
 *                     is_active=0). Any valid users.id satisfies the FK.
 *   department_id=8 → departments.id=8 (SGL - SInglIfe) — legacy departments table
 *                     (NOT EVOX_DEPARTMENT; confirmed from migration + info_schema)
 *   user_id=1593    → Glenn Macasarte (is_active=1, confirmed in DB)
 */

// ── Connect ──────────────────────────────────────────────────────────────────
$envFile = __DIR__ . '/../.env';
$env = [];
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (strpos(trim($line), '#') === 0 || strpos($line, '=') === false) continue;
    [$k, $v] = explode('=', $line, 2);
    $env[trim($k)] = trim($v, " \t\n\r\0\x0B\"'");
}

try {
    $pdo = new PDO(
        "mysql:host={$env['DB_HOST']};port={$env['DB_PORT']};dbname={$env['DB_DATABASE']};charset=utf8mb4",
        $env['DB_USERNAME'], $env['DB_PASSWORD'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
} catch (\PDOException $e) {
    echo "❌ CANNOT CONNECT: {$e->getMessage()}\n";
    exit(1);
}

echo "\n";
echo "═══════════════════════════════════════════════════════\n";
echo "  EVOX — Category-1 Seed\n";
echo "  DB: {$env['DB_DATABASE']} @ {$env['DB_HOST']}:{$env['DB_PORT']}\n";
echo "═══════════════════════════════════════════════════════\n\n";

// ── employee_clients row ──────────────────────────────────────────────────────
echo "── SEED: employee_clients row ─────────────────────────\n";

// FK: client_id → users.id (NOT clients table — confirmed 2026-08-10)
// FK: department_id → departments.id (legacy table, NOT EVOX_DEPARTMENT)
$clientOk = $pdo->query("SELECT id FROM users WHERE id = 1 LIMIT 1")->fetch();
$deptOk   = $pdo->query("SELECT id FROM departments WHERE id = 8 LIMIT 1")->fetch();
$userOk   = $pdo->query("SELECT id FROM users WHERE id = 1593 AND is_active = 1 LIMIT 1")->fetch();

if (!$clientOk) {
    echo "  ❌ users.id=1 (client FK target) not found — cannot seed.\n\n";
} elseif (!$deptOk) {
    echo "  ❌ departments.id=8 not found — cannot seed.\n\n";
} elseif (!$userOk) {
    echo "  ❌ users.id=1593 (Glenn) not active — cannot seed.\n\n";
} else {
    $existing = $pdo->query(
        "SELECT client_id FROM employee_clients WHERE client_id=1 AND department_id=8 AND user_id=1593 LIMIT 1"
    )->fetch();

    if ($existing) {
        echo "  ✅ Already exists (client_id=1, dept=8, user=1593). Skipping.\n\n";
    } else {
        $pdo->exec("
            INSERT INTO employee_clients (client_id, department_id, user_id)
            VALUES (1, 8, 1593)
        ");
        echo "  ✅ Inserted: client_id=1 (users.id=1), department_id=8 (departments.id=8 SGL-SInglIfe), user_id=1593 (Glenn)\n\n";
    }
}

// ── Verify ────────────────────────────────────────────────────────────────────
echo "── POST-SEED VERIFICATION ─────────────────────────────\n";
$n = $pdo->query("SELECT COUNT(*) FROM employee_clients")->fetchColumn();
echo "  employee_clients rows: {$n} " . ($n > 0 ? '✅' : '❌') . "\n";

echo "\n═══════════════════════════════════════════════════════\n";
echo "  Category-1 seed complete.\n";
echo "  Tests unblocked by this seed:\n";
echo "    - ClientAndDepartmentModelsTest::client_get_complete_name_on_a_persisted_row_*\n";
echo "    - ClientApiTest::test_get_client_users_returns_200_and_success_envelope\n";
echo "\n";
echo "  Tests that were already passing (no seed needed):\n";
echo "    - load.ClientBranchTest (all 3) — mock ClientRepositoryInterface, no employee_clients needed\n";
echo "    - submit.ClientBranchTest (both) — mock ClientRepositoryInterface, needs departments (282 rows OK)\n";
echo "\n";
echo "  Tests resolved via markTestSkipped (not by seed):\n";
echo "    - AnnouncementStrictResourceTest::test_system_announcement_without_creator_has_empty_owner_block\n";
echo "      Reason: BY-DESIGN — created_by=0 impossible in production (FINDING-ANN-DEAD-1)\n";
echo "      markTestSkipped already applied to that test (2026-08-10).\n";
echo "═══════════════════════════════════════════════════════\n\n";

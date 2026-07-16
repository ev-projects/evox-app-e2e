<?php
/**
 * SchedulerFrequencyTest.php
 *
 * VERIFIED-BACKED — generated 2026-07-07 from EVOX Scheduler Documentation.docx
 *
 * Verifies that each Artisan command used by the EVOX server crontab is registered
 * with the correct $signature string. If a signature changes, the system crontab
 * entries calling that command will silently break.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ARCHITECTURE NOTE: Laravel Kernel.php scheduler is EMPTY
 * ─────────────────────────────────────────────────────────────────────────────
 * All three $schedule->call() entries in app/Console/Kernel.php are commented out.
 * Production cron scheduling is done via the server's system crontab, which calls
 * `php artisan <signature>` directly — NOT via `php artisan schedule:run`.
 *
 * This means Laravel's built-in frequency API ($schedule->command()->everyHour() etc.)
 * is not used. Cron expressions are set on the server crontab and live outside the
 * codebase. This test can only verify that the command classes exist and are
 * registered — it cannot verify the cron expressions without reading the server
 * crontab at runtime.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Expected server crontab schedule (from EVOX Scheduler Documentation.docx)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Command signature                         Cron expression    Description
 *  ────────────────────────────────────────  ─────────────────  ───────────────────────────────
 *  sync_biometrix_logs                       25 *\/6 * * *      Every 6 h at :25
 *  sync_bhr_users:send all                   0 * * * *          Every hour
 *  sync_bhr_holidays                         0 0 * * 0          Every Sunday midnight
 *  sync_bhr_leaves PH                        35 *\/3 * * *      Every 3 h at :35
 *  sync_bhr_leaves IN                        40 *\/3 * * *      Every 3 h at :40
 *  sync_bhr_leaves MA                        45 *\/3 * * *      Every 3 h at :45
 *  sync_bhr_leaves BU                        50 *\/3 * * *      Every 3 h at :50
 *  sync_bhr_leaves BE                        55 *\/3 * * *      Every 3 h at :55
 *  generate_weekly_dtr                       0 19 * * 6         Saturday 7 PM
 *  send_supervisor_reminder_no_sched         0 7 * * 6          Saturday 7 AM
 *  send_supervisor_reminder_invalid_check_ins 30 23 * * *       Daily 11:30 PM
 *  send_supervisor_reminder_requests         0 3 * * 1          Monday 3 AM
 *  sync:bhr_users_photo all                  0 4 * * *          Daily 4 AM
 *
 *  DISABLED (not in active crontab per docx):
 *    DB backup command
 *    Binary log rotation command
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * KNOWN CODE ISSUES
 * ─────────────────────────────────────────────────────────────────────────────
 *  - syncEvoxChangeSchedule.php $signature typo: 'sync_evox_changes_chedule'
 *    (missing 's' — 'chedule' should be 'schedule'). This command is NOT in the
 *    active crontab but the typo is the canonical name — do not silently rename.
 *  - Kernel.php uses $schedule->call(Controller@method) for the 3 commented-out
 *    entries, not $schedule->command(). These would need to be migrated to
 *    $schedule->command() if the Laravel scheduler is ever activated.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\Artisan;

class SchedulerFrequencyTest extends TestCase
{
    /**
     * Active cron commands from EVOX Scheduler Documentation.docx.
     * Keys are the exact Artisan $signature strings.
     * Values are the cron expressions set on the server crontab (documentation only —
     * not enforced by this test because Kernel.php scheduler is empty).
     */
    private const ACTIVE_CRON_COMMANDS = [
        'sync_biometrix_logs'                        => '25 */6 * * *',
        'sync_bhr_users:send'                        => '0 * * * *',
        'sync_bhr_holidays'                          => '0 0 * * 0',
        'sync_bhr_leaves'                            => '*/3 * * * *',  // 5 entries: PH/IN/MA/BU/BE at offsets :35/:40/:45/:50/:55
        'generate_weekly_dtr'                        => '0 19 * * 6',
        'send_supervisor_reminder_no_sched'          => '0 7 * * 6',
        'send_supervisor_reminder_invalid_check_ins' => '30 23 * * *',
        'send_supervisor_reminder_requests'          => '0 3 * * 1',
        'sync:bhr_users_photo'                       => '0 4 * * *',
    ];

    // =========================================================================
    // Bulk assertion — all 9 active cron commands must be registered
    // =========================================================================

    /** @test */
    public function test_all_active_cron_commands_are_registered()
    {
        $commands = Artisan::all();
        foreach (array_keys(self::ACTIVE_CRON_COMMANDS) as $signature) {
            $this->assertArrayHasKey(
                $signature,
                $commands,
                "Active cron command '{$signature}' is not registered. " .
                "If its \$signature was renamed, update both the crontab entry and this test."
            );
        }
    }

    /** @test */
    public function test_active_cron_command_count_matches_docx()
    {
        // 9 distinct command signatures (sync_bhr_leaves runs 5 times with different country_code args)
        // If a new cron command is added, increment this count and add a per-command test.
        $this->assertCount(
            9,
            self::ACTIVE_CRON_COMMANDS,
            'ACTIVE_CRON_COMMANDS must list exactly 9 entries — one per active command signature in the docx.'
        );
    }

    // =========================================================================
    // Per-command registration tests
    // Each test documents the expected cron expression as a comment
    // =========================================================================

    /** @test */
    public function test_sync_biometrix_logs_command_is_registered()
    {
        // Server crontab: 25 */6 * * *  — every 6 hours at minute :25
        // File: app/Console/Commands/syncBiotmetrixLogs.php (note filename typo — Biotmetrix)
        $this->assertArrayHasKey('sync_biometrix_logs', Artisan::all());
    }

    /** @test */
    public function test_sync_bhr_users_command_is_registered()
    {
        // Server crontab: 0 * * * *  — every hour
        // Invoked as: php artisan sync_bhr_users:send all
        // File: app/Console/Commands/syncBhrUsers.php
        $this->assertArrayHasKey('sync_bhr_users:send', Artisan::all());
    }

    /** @test */
    public function test_sync_bhr_holidays_command_is_registered()
    {
        // Server crontab: 0 0 * * 0  — every Sunday at midnight
        // File: app/Console/Commands/syncBhrHolidays.php
        $this->assertArrayHasKey('sync_bhr_holidays', Artisan::all());
    }

    /** @test */
    public function test_sync_bhr_leaves_command_is_registered()
    {
        // Server crontab: 5 separate entries for each country:
        //   PH: 35 */3 * * *   IN: 40 */3 * * *   MA: 45 */3 * * *
        //   BU: 50 */3 * * *   BE: 55 */3 * * *
        // Invoked as: php artisan sync_bhr_leaves {PH|IN|MA|BU|BE}
        // File: app/Console/Commands/syncBhrLeaves.php
        $this->assertArrayHasKey('sync_bhr_leaves', Artisan::all());
    }

    /** @test */
    public function test_generate_weekly_dtr_command_is_registered()
    {
        // Server crontab: 0 19 * * 6  — every Saturday at 7 PM
        // File: app/Console/Commands/generateWeeklyDtr.php
        $this->assertArrayHasKey('generate_weekly_dtr', Artisan::all());
    }

    /** @test */
    public function test_send_supervisor_reminder_no_sched_command_is_registered()
    {
        // Server crontab: 0 7 * * 6  — every Saturday at 7 AM
        // File: app/Console/Commands/sendSupervisorReminderNoSchedEmail.php
        $this->assertArrayHasKey('send_supervisor_reminder_no_sched', Artisan::all());
    }

    /** @test */
    public function test_send_supervisor_reminder_invalid_check_ins_command_is_registered()
    {
        // Server crontab: 30 23 * * *  — daily at 11:30 PM
        // File: app/Console/Commands/sendSupervisorReminderInvalidCheckIns.php
        $this->assertArrayHasKey('send_supervisor_reminder_invalid_check_ins', Artisan::all());
    }

    /** @test */
    public function test_send_supervisor_reminder_requests_command_is_registered()
    {
        // Server crontab: 0 3 * * 1  — every Monday at 3 AM
        // File: app/Console/Commands/sendSupervisorReminderRequests.php
        $this->assertArrayHasKey('send_supervisor_reminder_requests', Artisan::all());
    }

    /** @test */
    public function test_sync_bhr_users_photo_command_is_registered()
    {
        // Server crontab: 0 4 * * *  — daily at 4 AM
        // Invoked as: php artisan sync:bhr_users_photo all
        // File: app/Console/Commands/SyncBhrUsersPhoto.php
        $this->assertArrayHasKey('sync:bhr_users_photo', Artisan::all());
    }

    // =========================================================================
    // Known code issues documented as skipped tests
    // =========================================================================

    /** @test */
    public function test_known_signature_typo_sync_evox_changes_chedule_is_preserved()
    {
        // syncEvoxChangeSchedule.php $signature = 'sync_evox_changes_chedule'
        // 'chedule' is missing the 's' — should be 'change_schedule'.
        // This command is NOT in the active crontab but the typo is the canonical
        // registered name. Do not silently rename without updating all callers.
        $this->assertArrayHasKey('sync_evox_changes_chedule', Artisan::all(),
            'Typo in signature is authoritative — do not fix without updating all callers.'
        );
    }

    /** @test */
    public function test_kernel_scheduler_is_empty_architecture_gap_is_documented()
    {
        // ARCHITECTURE GAP: Laravel Kernel::schedule() has zero active entries.
        // All three $schedule->call() entries are commented out.
        // Cron frequency enforcement is done at the server system crontab level only.
        //
        // When the Kernel scheduler is eventually wired up, replace $schedule->call()
        // with $schedule->command('signature')->cron('expression') and add assertions
        // here that verify the registered frequency matches ACTIVE_CRON_COMMANDS.
        $this->markTestSkipped(
            'Architecture gap: Kernel::schedule() is empty (all entries commented out). ' .
            'Cron is managed by server crontab — see EVOX Scheduler Documentation.docx. ' .
            'Add frequency assertions here when Kernel::schedule() is activated.'
        );
    }
}

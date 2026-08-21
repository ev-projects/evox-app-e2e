<?php

namespace Tests\Feature\BranchTests\Support;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Reroutes the `biometrix` (door-scanner SQL Server) connection to an in-memory sqlite database
 * carrying a `checkinout` fixture table, so tests exercise the REAL BiometricsRepository against a
 * local stand-in instead of the live device host.
 *
 * WHY THIS IS SAFE AND NEEDS NO APP CHANGE
 *   The Biometrics model references its connection by NAME only (`protected $connection = 'biometrix'`).
 *   Overriding that connection's config here reroutes every query the model makes without touching a
 *   single line of app code — the model and BiometricsRepository stay exactly as they are. get_biometrics()
 *   uses only portable Eloquent (select/whereIn/whereBetween/orderBy/get), which the query builder
 *   compiles to the right dialect per connection, so it runs unchanged against sqlite.
 *
 *   The result: the real repository executes (its coverage is preserved and its success path is
 *   finally reached), the live SQL Server is never contacted, there is no network and no hang risk,
 *   and nothing is written to the real device database.
 *
 * The two seeded punches sit inside the 2026-07-01 00:00:00 .. 00:01:00 window the biometrics tests
 * read, one clock-in and one clock-out, so the type filter is actually exercised.
 */
trait BiometrixSqliteTrait
{
    /**
     * Point `biometrix` at an in-memory sqlite that holds a `checkinout` table with a couple of
     * fixture punches. Call from setUp() after parent::setUp().
     */
    protected function bootBiometrixSqlite(): void
    {
        Config::set('database.connections.biometrix', [
            'driver'   => 'sqlite',
            'database' => ':memory:',
            'prefix'   => '',
        ]);
        // Drop any cached handle (a real MsSQL one included) so the next query resolves the sqlite config.
        DB::purge('biometrix');

        $schema = Schema::connection('biometrix');
        if (!$schema->hasTable('checkinout')) {
            $schema->create('checkinout', function ($table) {
                $table->integer('Logid')->nullable();
                $table->string('Userid')->nullable();
                $table->string('CheckTime')->nullable();
                $table->string('CheckType')->nullable();
                $table->string('Sensorid')->nullable();
            });
        }

        // Query builder insert (not the read-only model) — one in, one out, inside the tests' window.
        DB::connection('biometrix')->table('checkinout')->insert([
            ['Logid' => 1, 'Userid' => '209001', 'CheckTime' => '2026-07-01 00:00:20', 'CheckType' => 'I', 'Sensorid' => '1'],
            ['Logid' => 2, 'Userid' => '209001', 'CheckTime' => '2026-07-01 00:00:40', 'CheckType' => 'O', 'Sensorid' => '1'],
        ]);
    }

    /**
     * Drop the sqlite handle so a later test resolves a fresh connection. The framework rebuilds the
     * application between tests anyway, so this is belt-and-braces.
     */
    protected function tearDownBiometrixSqlite(): void
    {
        DB::purge('biometrix');
    }
}

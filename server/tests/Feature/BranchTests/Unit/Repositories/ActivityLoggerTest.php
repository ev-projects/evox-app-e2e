<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use App\Classes\EvoxActivityLogger;
use App\Models\Activity;
use App\Modules\User\Models\User;
use Illuminate\Config\Repository as ConfigRepository;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Guard;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Activitylog\Exceptions\CouldNotLogActivity;
use Tests\TestCase;

/**
 * COMPLETES: App\Classes\EvoxActivityLogger (app/Classes/ActivityLogger.php) — the audit-trail
 * builder behind the global log_activity() / evox_activity() helpers. Every "who did what to
 * whom" row EVOX keeps is produced by this one class, so a mis-tagged causer or a silently
 * dropped subject is an audit hole nobody would ever notice: the entry still gets written, it
 * just points at the wrong person. 6 of its 8 members were at 0% and CRAP was 67.
 *
 * WHY NO DatabaseTransactions TRAIT: the suite never touches a server database.
 *   - Every builder/placeholder test is pure in-memory (unsaved Eloquent models, a stub Guard).
 *   - The two tests that must reach ->save() rebind the `evox_logs` connection to a PROCESS-LOCAL
 *     sqlite `:memory:` database for the duration of the test (see useInMemoryActivityLog()).
 *     Nothing is created, read or written on any real server; the original connection config is
 *     restored and the connection purged in tearDown. If pdo_sqlite is unavailable the test skips.
 *   - The Guard is a local stub, so causedBy($id) never issues a users-table lookup either.
 *
 * ARMS COVERED
 *   __construct .............. seeds causer from the authenticated user + default log name.
 *   performedOn / on ......... subject tagging + the alias delegation, fluent return.
 *   causedBy / by ............ Model arm, resolve-by-id arm, and BOTH failure arms
 *                              (unknown id, null id) which throw CouldNotLogActivity.
 *   withProperties ........... array arm and Collection arm (bag is REPLACED, not merged).
 *   withProperty ............. adds/overwrites a single key on top of the bag.
 *   useLog ................... overrides the configured default log name.
 *   log ...................... success path (subject + causer + properties + placeholders)
 *                              AND the guard path where performedOn/causedBy are both null.
 *   normalizeCauser .......... all three arms (instanceof / retrieveById hit / throw).
 *   replacePlaceholders ...... resolves :causer.x, :subject.x, :properties.x; leaves an unknown
 *                              attribute, a dotless token and a missing property untouched; and
 *                              the no-token description that never enters the callback at all.
 *
 * FINDINGS characterised here (current behaviour asserted, app code NOT changed):
 *   ACTLOG_001 — config('laravel-activitylog.activity_model') points at \App\Models\ActivityLogs,
 *                a class that does not exist; spatie/laravel-activitylog 1.0.0 has no such option
 *                and EvoxActivityLogger hardcodes App\Models\Activity, so the setting is inert.
 *   ACTLOG_002 — normalizeCauser() calls $this->auth->getProvider(), which is NOT part of the
 *                Illuminate\Contracts\Auth\Guard contract the constructor type-hints. Any guard
 *                without that method (e.g. a RequestGuard) fatals on causedBy($id).
 */
class ActivityLoggerTest extends TestCase
{
    /** @var ActivityLoggerStubUserProvider|null last provider handed to a logger built here */
    private $stubProvider;

    /** @var array|null saved evox_logs connection config while the sqlite mirror is active */
    private $originalLogsConnection;

    /** @var bool */
    private $usingInMemoryLog = false;

    protected function tearDown(): void
    {
        if ($this->usingInMemoryLog) {
            DB::purge('evox_logs');
            config(['database.connections.evox_logs' => $this->originalLogsConnection]);
            $this->usingInMemoryLog = false;
            $this->originalLogsConnection = null;
        }

        parent::tearDown();
    }

    // ------------------------------------------------------------------ construction

    /** @test */
    public function new_logger_starts_from_the_signed_in_user_and_the_configured_log_name()
    {
        $signedIn = $this->fakeUser(4242, ['email' => 'auditor@company.com']);

        $logger = $this->makeLogger($signedIn);

        $this->assertSame($signedIn, $this->readProperty($logger, 'causedBy'));
        $this->assertNull($this->readProperty($logger, 'performedOn'));
        $this->assertSame('default', $this->readProperty($logger, 'logName'));
        $this->assertSame([], $this->readProperty($logger, 'properties')->all());
    }

    /** @test */
    public function new_logger_leaves_the_causer_empty_for_an_unauthenticated_request()
    {
        $logger = $this->makeLogger(null);

        $this->assertNull($this->readProperty($logger, 'causedBy'));
    }

    // ------------------------------------------------------------------ subject tagging

    /** @test */
    public function performed_on_tags_the_subject_and_the_on_alias_replaces_it()
    {
        $logger = $this->makeLogger(null);

        $first = $this->fakeUser(9001);
        $this->assertSame($logger, $logger->performedOn($first));
        $this->assertSame($first, $this->readProperty($logger, 'performedOn'));

        $second = $this->fakeUser(9002);
        $this->assertSame($logger, $logger->on($second));               // alias delegates
        $this->assertSame($second, $this->readProperty($logger, 'performedOn'));
    }

    // ------------------------------------------------------------------ causer tagging

    /** @test */
    public function caused_by_accepts_a_model_and_the_by_alias_replaces_it()
    {
        $logger = $this->makeLogger(null);

        $actor = $this->fakeUser(11);
        $this->assertSame($logger, $logger->causedBy($actor));          // instanceof Model arm
        $this->assertSame($actor, $this->readProperty($logger, 'causedBy'));

        $delegate = $this->fakeUser(12);
        $this->assertSame($logger, $logger->by($delegate));             // alias delegates
        $this->assertSame($delegate, $this->readProperty($logger, 'causedBy'));

        $this->assertSame([], $this->stubProvider->lookups);            // no id lookup was needed
    }

    /** @test */
    public function caused_by_resolves_a_bare_employee_id_through_the_auth_provider()
    {
        $resolved = $this->fakeUser(77, ['email' => 'hr@company.com']);

        $logger = $this->makeLogger(null, ['77' => $resolved]);

        $logger->causedBy(77);                                          // retrieveById hit arm

        $this->assertSame($resolved, $this->readProperty($logger, 'causedBy'));
        $this->assertSame([77], $this->stubProvider->lookups);
    }

    /** @test */
    public function caused_by_an_unknown_employee_id_is_refused_and_keeps_the_previous_causer()
    {
        $signedIn = $this->fakeUser(4242);
        $logger = $this->makeLogger($signedIn);                         // provider knows nobody

        try {
            $logger->causedBy(999999999);
            $this->fail('Expected CouldNotLogActivity for an unresolvable causer id.');
        } catch (CouldNotLogActivity $e) {
            $this->assertStringContainsString('Could not determine a user with identifier', $e->getMessage());
            $this->assertStringContainsString('999999999', $e->getMessage());
        }

        // the throw happens before the assignment, so the builder is left untouched
        $this->assertSame($signedIn, $this->readProperty($logger, 'causedBy'));
    }

    /** @test */
    public function caused_by_null_is_refused_rather_than_silently_clearing_the_causer()
    {
        $signedIn = $this->fakeUser(4242);
        $logger = $this->makeLogger($signedIn);

        try {
            $logger->causedBy(null);                                    // null is NOT a Model
            $this->fail('Expected CouldNotLogActivity for a null causer.');
        } catch (CouldNotLogActivity $e) {
            $this->assertStringContainsString('Could not determine a user with identifier', $e->getMessage());
        }

        $this->assertSame($signedIn, $this->readProperty($logger, 'causedBy'));
        $this->assertSame([null], $this->stubProvider->lookups);
    }

    /** @test */
    public function caused_by_id_fatals_on_a_guard_without_a_user_provider_FINDING_ACTLOG_002()
    {
        // FINDING ACTLOG_002 — normalizeCauser() calls a method that the type-hinted
        // Illuminate\Contracts\Auth\Guard contract does not declare. Characterised, not fixed.
        $this->assertFalse(
            method_exists(Guard::class, 'getProvider'),
            'Guard contract unexpectedly declares getProvider(); ACTLOG_002 may be resolved.'
        );

        $logger = new EvoxActivityLogger(
            new ActivityLoggerProviderlessGuard(),
            $this->activityLogConfig()
        );

        $this->expectException(\Error::class);
        $logger->causedBy(77);
    }

    // ------------------------------------------------------------------ property bag

    /** @test */
    public function with_properties_replaces_the_bag_from_an_array_or_a_collection()
    {
        $logger = $this->makeLogger(null);

        $this->assertSame($logger, $logger->withProperties(['REMOTE_ADDR' => '10.0.0.9']));
        $this->assertSame(['REMOTE_ADDR' => '10.0.0.9'], $this->readProperty($logger, 'properties')->all());

        // Collection arm — and it REPLACES, it does not merge
        $logger->withProperties(collect(['REQUEST_METHOD' => 'POST']));
        $this->assertSame(['REQUEST_METHOD' => 'POST'], $this->readProperty($logger, 'properties')->all());
    }

    /** @test */
    public function with_property_adds_one_key_on_top_of_the_bag_and_overwrites_a_repeat()
    {
        $logger = $this->makeLogger(null);

        $logger->withProperties(['REQUEST_METHOD' => 'POST']);
        $this->assertSame($logger, $logger->withProperty('REQUEST_URI', '/api/leaves'));

        $this->assertSame(
            ['REQUEST_METHOD' => 'POST', 'REQUEST_URI' => '/api/leaves'],
            $this->readProperty($logger, 'properties')->all()
        );

        $logger->withProperty('REQUEST_URI', '/api/overtime');
        $this->assertSame('/api/overtime', $this->readProperty($logger, 'properties')->get('REQUEST_URI'));
    }

    // ------------------------------------------------------------------ log channel

    /** @test */
    public function use_log_overrides_the_configured_default_channel()
    {
        $logger = $this->makeLogger(null);

        $this->assertSame('default', $this->readProperty($logger, 'logName'));
        $this->assertSame($logger, $logger->useLog('activity'));
        $this->assertSame('activity', $this->readProperty($logger, 'logName'));
    }

    // ------------------------------------------------------------------ placeholders

    /** @test */
    public function placeholders_resolve_causer_subject_and_property_tokens()
    {
        $logger = $this->makeLogger(null);

        $activity = new Activity();
        $activity->causer()->associate($this->fakeUser(4242, ['email' => 'auditor@company.com']));
        $activity->subject()->associate($this->fakeUser(9001, ['first_name' => 'Marina']));
        $activity->properties = collect(['REMOTE_ADDR' => '10.0.0.9']);

        $rendered = $this->renderDescription(
            $logger,
            ':causer.email edited :subject.first_name from :properties.REMOTE_ADDR',
            $activity
        );

        $this->assertSame('auditor@company.com edited Marina from 10.0.0.9', $rendered);
    }

    /** @test */
    public function placeholders_that_cannot_be_resolved_are_left_verbatim()
    {
        $logger = $this->makeLogger(null);

        $activity = new Activity();
        $activity->properties = collect(['REMOTE_ADDR' => '10.0.0.9']);

        // :system.status -> attribute not in the whitelist    -> returned untouched
        // :endpoint      -> no dot, so the attribute is ''    -> returned untouched
        // :properties.missing -> whitelisted but absent       -> array_get default = the token
        $rendered = $this->renderDescription(
            $logger,
            ':system.status :endpoint :properties.missing',
            $activity
        );

        $this->assertSame(':system.status :endpoint :properties.missing', $rendered);
    }

    /** @test */
    public function a_description_without_tokens_never_enters_the_replacement_callback()
    {
        $logger = $this->makeLogger(null);

        $this->assertSame(
            'Payroll cutoff closed',
            $this->renderDescription($logger, 'Payroll cutoff closed', new Activity())
        );
    }

    // ------------------------------------------------------------------ persistence

    /** @test */
    public function log_writes_one_audit_entry_carrying_subject_causer_properties_and_channel()
    {
        $this->useInMemoryActivityLog();

        $causer = $this->fakeUser(4242, ['email' => 'auditor@company.com']);
        $subject = $this->fakeUser(9001, ['first_name' => 'Marina']);

        $logger = $this->makeLogger($causer);
        $logger->on($subject)
            ->by($causer)
            ->useLog('activity')
            ->withProperties(['REMOTE_ADDR' => '10.0.0.9'])
            ->withProperty('REQUEST_METHOD', 'PUT')
            ->log(':causer.email updated :subject.first_name');

        $entry = Activity::orderBy('id', 'desc')->first();

        $this->assertNotNull($entry, 'log() did not persist an activity row.');
        $this->assertSame('activity', $entry->log_name);
        $this->assertSame('auditor@company.com updated Marina', $entry->description);
        $this->assertSame(User::class, $entry->causer_type);
        $this->assertEquals(4242, $entry->causer_id);
        $this->assertSame(User::class, $entry->subject_type);
        $this->assertEquals(9001, $entry->subject_id);
        $this->assertSame('10.0.0.9', $entry->properties->get('REMOTE_ADDR'));
        $this->assertSame('PUT', $entry->properties->get('REQUEST_METHOD'));
    }

    /** @test */
    public function log_still_records_an_unattended_job_with_no_subject_and_no_causer()
    {
        $this->useInMemoryActivityLog();

        // guest logger: causedBy stays null and performedOn was never set — both guards fall through
        $this->makeLogger(null)->log('Scheduled biometrics sync finished');

        $entry = Activity::orderBy('id', 'desc')->first();

        $this->assertNotNull($entry, 'log() dropped the entry when there was no subject/causer.');
        $this->assertSame('Scheduled biometrics sync finished', $entry->description);
        $this->assertSame('default', $entry->log_name);
        $this->assertNull($entry->subject_id);
        $this->assertNull($entry->subject_type);
        $this->assertNull($entry->causer_id);
        $this->assertNull($entry->causer_type);
        $this->assertSame([], $entry->properties->all());
    }

    /** @test */
    public function configured_activity_model_is_dead_config_FINDING_ACTLOG_001()
    {
        // FINDING ACTLOG_001 — config/laravel-activitylog.php names an activity_model class that
        // does not exist. spatie/laravel-activitylog 1.0.0 never reads that key and
        // EvoxActivityLogger hardcodes `new Activity()`, so the setting is inert today. Editing
        // it to redirect audit rows would do nothing. Characterised, not fixed.
        $configured = config('laravel-activitylog.activity_model');

        $this->assertSame('App\\Models\\ActivityLogs', ltrim((string) $configured, '\\'));
        $this->assertFalse(class_exists($configured), 'ACTLOG_001 looks resolved; revisit this test.');
        $this->assertTrue(class_exists(Activity::class));

        $this->useInMemoryActivityLog();

        $this->makeLogger(null)->log('Dead config check');

        $this->assertInstanceOf(Activity::class, Activity::orderBy('id', 'desc')->first());
    }

    // ------------------------------------------------------------------ helpers

    /** Build the class under test on a local stub guard — no container, no auth driver, no DB. */
    private function makeLogger($currentUser = null, array $usersById = []): EvoxActivityLogger
    {
        $this->stubProvider = new ActivityLoggerStubUserProvider($usersById);

        return new EvoxActivityLogger(
            new ActivityLoggerStubGuard($currentUser, $this->stubProvider),
            $this->activityLogConfig()
        );
    }

    private function activityLogConfig(): ConfigRepository
    {
        return new ConfigRepository([
            'laravel-activitylog' => ['default_log_name' => 'default'],
        ]);
    }

    /** Unsaved User — enough for getKey()/getMorphClass()/toArray() without ever hitting MySQL. */
    private function fakeUser($id, array $attributes = []): User
    {
        $user = new User();
        $user->id = $id;

        foreach ($attributes as $key => $value) {
            $user->$key = $value;
        }

        return $user;
    }

    private function readProperty(EvoxActivityLogger $logger, string $name)
    {
        $property = new \ReflectionProperty(EvoxActivityLogger::class, $name);
        $property->setAccessible(true);

        return $property->getValue($logger);
    }

    private function renderDescription(EvoxActivityLogger $logger, string $description, Activity $activity): string
    {
        $method = new \ReflectionMethod(EvoxActivityLogger::class, 'replacePlaceholders');
        $method->setAccessible(true);

        return $method->invoke($logger, $description, $activity);
    }

    /**
     * Point the `evox_logs` connection at a sqlite database that lives only inside this PHP
     * process, then create the activity_log table there. No server database is contacted, so
     * ->save() is safe to run for real. tearDown() restores the original connection config.
     */
    private function useInMemoryActivityLog(): void
    {
        if (! extension_loaded('pdo_sqlite')) {
            $this->markTestSkipped('pdo_sqlite is unavailable; refusing to write activity_log on a real connection.');
        }

        $this->originalLogsConnection = config('database.connections.evox_logs');

        config(['database.connections.evox_logs' => [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => false,
        ]]);

        DB::purge('evox_logs');
        $this->usingInMemoryLog = true;

        try {
            Schema::connection('evox_logs')->create('activity_log', function (Blueprint $table) {
                $table->increments('id');
                $table->string('log_name')->nullable();
                $table->text('description')->nullable();
                $table->integer('subject_id')->nullable();
                $table->string('subject_type')->nullable();
                $table->integer('causer_id')->nullable();
                $table->string('causer_type')->nullable();
                $table->text('properties')->nullable();
                $table->timestamps();
            });
        } catch (\Throwable $e) {
            $this->markTestSkipped('Could not build the in-memory activity_log mirror: ' . $e->getMessage());
        }
    }
}

/**
 * Minimal Guard implementation. user() feeds the constructor; getProvider() feeds
 * normalizeCauser() and records every lookup so the tests can assert on it.
 */
class ActivityLoggerStubGuard implements Guard
{
    private $currentUser;
    private $provider;

    public function __construct($currentUser = null, $provider = null)
    {
        $this->currentUser = $currentUser;
        $this->provider = $provider ?: new ActivityLoggerStubUserProvider();
    }

    public function check()
    {
        return $this->currentUser !== null;
    }

    public function guest()
    {
        return $this->currentUser === null;
    }

    public function user()
    {
        return $this->currentUser;
    }

    public function id()
    {
        return $this->currentUser === null ? null : $this->currentUser->getKey();
    }

    public function validate(array $credentials = [])
    {
        return false;
    }

    public function setUser(Authenticatable $user)
    {
        $this->currentUser = $user;
    }

    public function getProvider()
    {
        return $this->provider;
    }
}

/** A contract-only Guard — deliberately has NO getProvider(). Drives FINDING ACTLOG_002. */
class ActivityLoggerProviderlessGuard implements Guard
{
    public function check()
    {
        return false;
    }

    public function guest()
    {
        return true;
    }

    public function user()
    {
        return null;
    }

    public function id()
    {
        return null;
    }

    public function validate(array $credentials = [])
    {
        return false;
    }

    public function setUser(Authenticatable $user)
    {
        //
    }
}

/** Stand-in for the Eloquent user provider; returns only what a test explicitly registered. */
class ActivityLoggerStubUserProvider
{
    /** @var array every identifier normalizeCauser() asked for, in order */
    public $lookups = [];

    private $usersById;

    public function __construct(array $usersById = [])
    {
        $this->usersById = $usersById;
    }

    public function retrieveById($identifier)
    {
        $this->lookups[] = $identifier;

        $key = $identifier === null ? '' : (string) $identifier;

        return isset($this->usersById[$key]) ? $this->usersById[$key] : null;
    }
}

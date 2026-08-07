<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Monolog\Handler\TestHandler;
use Mockery;

use App\Modules\User\Models\User;
use App\Modules\Coe\Http\Controllers\COEController;
use App\Modules\Client\Http\Controllers\ClientController;
use App\Modules\Client\Http\Requests\AssignEmployeesClientRequest;
use App\Modules\Client\Repositories\ClientRepositoryInterface;
use App\Modules\Attendance\Http\Controllers\AttendanceController;
use App\Http\Controllers\CodeOfConductController;
use App\Http\Controllers\HappinessController;
use App\Http\Controllers\EvaController;
use App\Http\Controllers\NewHireOrientationController;

/**
 * ControllerCatchArms — HTTP entry points sitting 1-2 lines from 100%.
 *
 * FILENAME NOTE: the packet asked for `ControllerCatchArms.php`. phpunit-branchtests.xml discovers
 * `<directory suffix="Test.php">`, so a file without the `Test.php` suffix is never executed and the
 * lines below would never be covered. Written as `ControllerCatchArmsTest.php` so it actually runs.
 *
 * ---------------------------------------------------------------------------------------------
 * COVERED HERE (classification (a) — genuinely reachable, a real failure drives the line)
 * ---------------------------------------------------------------------------------------------
 *
 *  1. App\Modules\Client\Http\Controllers\ClientController — lines 41-42
 *     assignEmployeesClient()'s `catch (Exception $e)` body: log_to_file(...,'cron_errors') then
 *     error_response(). `Exception` IS imported here (line 14) so the arm binds. ClientRepository::
 *     assign_clients() genuinely rethrows (`catch (Exception $e) { log_error($e); throw $e; }`) when
 *     the forceDelete/firstOrCreate pair hits the DB — so a repository failure is the real-world
 *     driver. Test injects a ClientRepositoryInterface double that throws exactly that way.
 *
 *  2. App\Modules\Coe\Http\Controllers\COEController — lines 127-128
 *     getUsers()'s catch body: log_to_file('critical','API Call Failed!', ..., 'fs') then
 *     error_response(). `Exception` IS imported (line 15). The only thing inside the try that can
 *     fail in production is the `users` SELECT (auth guard resolution or the LIKE query), which
 *     surfaces as Illuminate\Database\QueryException (extends PDOException extends RuntimeException
 *     extends Exception). Test drives exactly that by arming a one-shot DB::listen that raises a
 *     QueryException for the users query, then disarms itself so the transaction rollback is safe.
 *
 *  3. App\Modules\Attendance\Http\Controllers\AttendanceController — line 242
 *     resolveRange()'s defensive 90-day clamp `$from = date('Y-m-d', $toTs - (90 * 86400));`.
 *     Not a catch arm — a guard. Unreachable over HTTP because AttendanceRangeRequest validates the
 *     cap first; the source comment says so explicitly ("if a caller manages to slip past the
 *     FormRequest validator"). Reached here by invoking the private helper directly, which is the
 *     only honest way to exercise a deliberate belt-and-braces clamp.
 *
 * ---------------------------------------------------------------------------------------------
 * NOT TESTED — reported as findings instead (see also test_dead_catch_arms_are_documented below)
 * ---------------------------------------------------------------------------------------------
 *
 *  (b) CodeOfConductController::store()   lines 64-65   — CTRL-EXC-1
 *  (b) HappinessController::addHappinessSurvey()  line 81 — CTRL-EXC-2
 *  (b) EvaController::store()             line 61      — CTRL-EXC-3
 *  (b) EvaController::saveEvaRegistration() line 91    — CTRL-EXC-4
 *      All four files declare `namespace App\Http\Controllers;` and DO NOT import `use Exception;`.
 *      PHP does not fall back to the global namespace for CLASS names, so `catch (Exception $e)`
 *      resolves to `App\Http\Controllers\Exception` — a class that does not exist anywhere in the
 *      tree (verified: no app/Http/Controllers/Exception.php, no such class declared). The arm can
 *      therefore never match ANY throwable. Every failure in these three controllers escapes as an
 *      unhandled 500 with a stack trace instead of the intended `{"error":{...}}` envelope.
 *      NewHireOrientationController, in the same namespace, DOES import Exception (line 13) — which
 *      is what makes this an accident rather than a convention.
 *
 *  (d) HappinessController::addHappinessSurvey()  line 83  — CTRL-DEAD-1
 *      The method's closing brace. Only reachable by falling off the end, i.e. when
 *      `HappinessSurvey::create($data)` is falsy. Eloquent's create() always returns a Model
 *      instance, and HappinessSurvey is a plain Model with no create()/newInstance() override, so
 *      the `if ($happiness_survey_post)` guard is always true. Dead line — and the guard is dead
 *      defensive code: if it ever were false the endpoint would answer HTTP 200 with an empty body.
 *
 *  (d) NewHireOrientationController::store()  line 77  — CTRL-DEAD-2
 *      Same shape. `NhoSurvey::insert($data)` reaches Illuminate\Database\Connection::statement(),
 *      which returns PDOStatement::execute() — true, or it throws (PDO is in ERRMODE_EXCEPTION).
 *      It can never return a falsy value, so `if ($nho == 1)` always returns and the closing brace
 *      is never reached. This controller's catch arm IS live (Exception imported) and is already
 *      covered; line 77 alone is what keeps the class off 100%.
 *
 *  (b) EvaController::store()  line 55  — CTRL-EXC-5 (bonus defect found while classifying)
 *      `$user_eva = EvaSurvey::where(...)->first();` then `$user_eva->update($data)` with no null
 *      check. A user with no open 2025-Q3 survey row gets `Call to a member function update() on
 *      null` — an \Error, not an \Exception. Even if the namespace defect above were fixed, this
 *      specific (and very likely) failure would still bypass `catch (Exception $e)`.
 *
 * HOUSE RULES: DatabaseTransactions only; no DDL, no seeding, no writes to `dtrs`; every DB read is
 * a bounded `orderBy('id','desc')->first()` probe with markTestSkipped when the row is absent.
 */
class ControllerCatchArmsTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::where('is_active', 1)->orderBy('id', 'desc')->first();
        if (!$this->user) {
            $this->markTestSkipped('no active user in the test DB — bounded probe found nothing');
        }
    }

    /**
     * Attach a Monolog TestHandler to a named EVOX log channel so we can assert the controller
     * actually logged the failure. Bubbling is left on, so the real daily handler still runs and
     * nothing about production logging behaviour is changed.
     */
    private function captureChannel(string $channel): TestHandler
    {
        $handler = new TestHandler();
        Log::channel($channel)->getLogger()->pushHandler($handler);

        return $handler;
    }

    private function payload(JsonResponse $response): array
    {
        return json_decode($response->getContent(), true);
    }

    /** Class source with every whitespace run collapsed, so plain substring checks are reliable. */
    private function normalisedSourceOf(string $class): string
    {
        return preg_replace('/\s+/', ' ', file_get_contents((new \ReflectionClass($class))->getFileName()));
    }

    /** True when the file has a top-level `use Exception;` (or `use \Exception;`) import. */
    private function importsException(string $normalisedSource): bool
    {
        return strpos($normalisedSource, ' use Exception;') !== false
            || strpos($normalisedSource, ' use \\Exception;') !== false;
    }

    // ===================================================================== ClientController 41-42

    /**
     * ClientController::assignEmployeesClient — the repository rethrows on any DB failure
     * (ClientRepository::assign_clients catches, log_error()s and re-throws). The controller must
     * turn that into the standard 400 error envelope, not let it escape as a 500.
     *
     * @test
     */
    public function a_failing_client_assignment_returns_the_error_envelope_and_is_logged_to_cron_errors()
    {
        $cronErrors = $this->captureChannel('cron_errors');

        // log_to_file() prefixes the entry with the authenticated user id; act as one so the
        // helper exercises the same branch it takes on a real authenticated POST.
        $this->actingAs($this->user);

        $repo = Mockery::mock(ClientRepositoryInterface::class);
        $repo->shouldReceive('assign_clients')
             ->once()
             ->andThrow(new \RuntimeException('SQLSTATE[23000]: Integrity constraint violation: client_department'));

        $controller = new ClientController($repo);

        $request = AssignEmployeesClientRequest::create('/api/client/assign', 'POST', [
            'client_id'        => 1,
            'department_id'    => 1,
            'employee_user_id' => [['value' => $this->user->id]],
        ]);

        $response = $controller->assignEmployeesClient($request);

        // Business rule: a repository failure is an API error, never a partial success.
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertSame(JsonResponse::HTTP_BAD_REQUEST, $response->getStatusCode());

        $body = $this->payload($response);
        $this->assertArrayHasKey('error', $body, 'error_response() envelope must be {"error":{...}}');
        $this->assertArrayNotHasKey('content', $body, 'a failure must not be shaped like success_response()');
        $this->assertSame(trans('messages.error_default'), $body['error']['message']);
        $this->assertStringContainsString(
            'Integrity constraint violation',
            $body['error']['content'],
            'error_response() unwraps the Exception into content via getMessage()'
        );

        // Business rule: the failure is recorded on the cron_errors channel at info level.
        $this->assertTrue(
            $cronErrors->hasInfoRecords(),
            'assignEmployeesClient must log_to_file(\'info\', ..., "cron_errors") before answering'
        );
        $this->assertTrue($cronErrors->hasRecordThatContains('Integrity constraint violation', \Monolog\Logger::INFO));
    }

    // ======================================================================= COEController 127-128

    /**
     * COEController::getUsers — the employee-suggestion lookup is a raw `users` SELECT. When that
     * query fails (guard resolution, lost connection, a bad LIKE binding) the endpoint must answer
     * the "No user matched" envelope rather than leaking a 500 into the COE request screen.
     *
     * @test
     */
    public function a_failing_user_lookup_returns_an_error_envelope_not_an_empty_suggestion_list()
    {
        $fs = $this->captureChannel('fs');

        $this->actingAs($this->user);

        // One-shot fault injection at the query boundary. DB::listen fires from
        // Connection::logQuery(), which sits OUTSIDE Connection::run()'s try/catch, so anything
        // thrown here propagates straight into the controller's try block — exactly where a real
        // QueryException would land. The flag disarms on the first hit so the DatabaseTransactions
        // rollback in tearDown is never affected.
        $armed = true;
        DB::listen(function ($query) use (&$armed) {
            if ($armed && stripos($query->sql, 'users') !== false) {
                $armed = false;
                throw new QueryException(
                    $query->sql,
                    (array) $query->bindings,
                    new \PDOException('SQLSTATE[HY000]: General error: simulated users read failure')
                );
            }
        });

        $controller = app(COEController::class);
        $request    = Request::create('/api/coe/users', 'GET', ['keyword' => 'zzz-no-such-employee']);

        $response = $controller->getUsers($request);

        $this->assertFalse($armed, 'the fault injector never fired — getUsers did not run a users query');

        // Business rule: the failure surfaces as the COE-specific error envelope at 400.
        $this->assertInstanceOf(JsonResponse::class, $response);
        $this->assertSame(JsonResponse::HTTP_BAD_REQUEST, $response->getStatusCode());

        $body = $this->payload($response);
        $this->assertArrayHasKey('error', $body);
        $this->assertSame('No user matched, please try again.', $body['error']['message']);
        $this->assertStringContainsString('simulated users read failure', $body['error']['content']);

        // The happy path returns a bare JSON array of {id,name}. Assert we did NOT get that shape —
        // a silent empty list here would read as "no such employee" to the COE screen.
        $this->assertFalse(array_key_exists(0, $body), 'must not degrade to an empty suggestion list');

        // Business rule: the failure is escalated to critical on the freshservice channel.
        $this->assertTrue(
            $fs->hasCriticalRecords(),
            'getUsers must log_to_file(\'critical\', \'API Call Failed!\', ..., "fs")'
        );
        $this->assertTrue($fs->hasRecordThatContains('API Call Failed!', \Monolog\Logger::CRITICAL));
    }

    // ======================================================================= AttendanceController 242

    /**
     * AttendanceController::resolveRange — the defensive 90-day clamp. AttendanceRangeRequest
     * already rejects an over-long range, so this line only fires for a caller that reached the
     * controller without the FormRequest (custom client, a route wired to a plain Request, or a
     * future rule regression). Invoked directly because that is the only state that reaches it.
     *
     * @test
     */
    public function an_over_long_date_range_is_clamped_to_the_ninety_day_cap()
    {
        $controller = app(AttendanceController::class);

        $method = new \ReflectionMethod(AttendanceController::class, 'resolveRange');
        $method->setAccessible(true);

        $requestedFrom = '2026-01-01';
        $requestedTo   = '2026-08-01';      // 212 days apart — far past the cap
        $request       = Request::create('/api/attendance/by-geo/1', 'GET', [
            'from' => $requestedFrom,
            'to'   => $requestedTo,
        ]);

        list($from, $to) = $method->invoke($controller, $request);

        // Business rule: the window is anchored on `to` and rewound to exactly 90 days.
        $this->assertSame($requestedTo, $to, 'the end of the window is never moved');
        $this->assertNotSame($requestedFrom, $from, 'the clamp must have rewritten `from`');
        $this->assertTrue(
            strtotime($from) > strtotime($requestedFrom),
            'the clamp moves `from` forward, it never widens the window'
        );
        $this->assertSame(
            90,
            (int) round((strtotime($to) - strtotime($from)) / 86400),
            'the clamped window must be exactly the 90-day cap'
        );
        $this->assertSame(date('Y-m-d', strtotime($requestedTo) - (90 * 86400)), $from);
    }

    /**
     * Negative control for the same guard: a range inside the cap is passed through untouched, so
     * the clamp cannot be silently truncating legitimate queries.
     *
     * @test
     */
    public function a_date_range_inside_the_cap_is_passed_through_untouched()
    {
        $controller = app(AttendanceController::class);

        $method = new \ReflectionMethod(AttendanceController::class, 'resolveRange');
        $method->setAccessible(true);

        $request = Request::create('/api/attendance/by-geo/1', 'GET', [
            'from' => '2026-06-01',
            'to'   => '2026-06-30',
        ]);

        list($from, $to) = $method->invoke($controller, $request);

        $this->assertSame('2026-06-01', $from);
        $this->assertSame('2026-06-30', $to);
    }

    /**
     * And the default window when the caller sends neither bound: first day of the current month
     * through today. Documented behaviour of the same helper.
     *
     * @test
     */
    public function an_absent_date_range_defaults_to_month_to_date()
    {
        $controller = app(AttendanceController::class);

        $method = new \ReflectionMethod(AttendanceController::class, 'resolveRange');
        $method->setAccessible(true);

        list($from, $to) = $method->invoke($controller, Request::create('/api/attendance/by-geo/1', 'GET'));

        $this->assertSame(date('Y-m-01'), $from);
        $this->assertSame(date('Y-m-d'), $to);
    }

    // ==================================================== findings guard: the dead catch arms

    /**
     * CTRL-EXC-1..4. Not a coverage test — an executable record of why four catch arms in
     * App\Http\Controllers can never be covered, and a tripwire that goes off the moment someone
     * fixes the import (at which point these arms become testable and this guard should be deleted
     * and replaced with real catch-arm tests).
     *
     * `catch (Exception $e)` inside `namespace App\Http\Controllers;` with no `use Exception;`
     * resolves to App\Http\Controllers\Exception. PHP falls back to the global namespace for
     * functions and constants, NEVER for class names — so the arm matches nothing at all.
     *
     * @test
     */
    public function the_unimported_exception_catch_arms_in_app_http_controllers_can_never_match()
    {
        $this->assertFalse(
            class_exists('App\\Http\\Controllers\\Exception'),
            'root cause: the class these catch arms name does not exist'
        );

        $broken = [
            CodeOfConductController::class      => 'store() line 64-65',
            HappinessController::class          => 'addHappinessSurvey() line 81',
            EvaController::class                => 'store() line 61 and saveEvaRegistration() line 91',
        ];

        foreach ($broken as $class => $where) {
            $source = $this->normalisedSourceOf($class);

            $this->assertTrue(
                strpos($source, 'catch(Exception $e)') !== false
                    || strpos($source, 'catch (Exception $e)') !== false,
                "$class no longer has an unqualified catch(Exception) — update this guard"
            );
            $this->assertFalse(
                $this->importsException($source),
                "DEFECT FIXED: $class now imports Exception, so $where is finally reachable. " .
                'Delete this guard and write a real catch-arm test that asserts the 400 envelope.'
            );
        }

        // Control: the fourth controller in the very same namespace does import it, which is why
        // its catch arm is already covered. If this ever flips, the whole namespace is broken.
        $this->assertTrue(
            $this->importsException($this->normalisedSourceOf(NewHireOrientationController::class)),
            'NewHireOrientationController is the working control case for this defect'
        );
    }
}

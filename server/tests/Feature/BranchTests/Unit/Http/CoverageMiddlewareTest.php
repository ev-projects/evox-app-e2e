<?php
/**
 * SOURCE UNDER TEST: app/Http/Middleware/CoverageMiddleware.php
 * MENU PATH:         none — development-only instrumentation, not reachable from any menu.
 * MEASURED COVERAGE AT AUTHORING (lines-%): handle 0.
 *
 * FINDINGS: none.
 *
 * SCOPE NOTE — only the DISABLED arm is exercised, on purpose. The remaining arms all begin by
 * calling xdebug_stop_code_coverage(true), which would discard the coverage data of the very run
 * measuring this file. There is no way to enter them from a test without corrupting the report, so
 * they are left uncovered deliberately rather than covered destructively. What matters about this
 * middleware in production is precisely the arm asserted here: with COVERAGE_ENABLED off it must be
 * inert — pass the request through untouched, return the downstream response unmodified, and write
 * nothing to disk.
 *
 * The middleware is a plain class with no container dependencies, so it is driven directly with a
 * stub request and a closure rather than through the HTTP kernel.
 */

namespace Tests\Feature\BranchTests\Unit\Http;

use Tests\TestCase;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Http\Middleware\CoverageMiddleware;

class CoverageMiddlewareTest extends TestCase
{
    /** @var CoverageMiddleware */
    private $middleware;

    /** @var string|false the COVERAGE_ENABLED value in force before the test touched it */
    private $originalFlag;

    protected function setUp(): void
    {
        parent::setUp();
        $this->middleware   = new CoverageMiddleware();
        $this->originalFlag = getenv('COVERAGE_ENABLED');
    }

    protected function tearDown(): void
    {
        if ($this->originalFlag === false) {
            putenv('COVERAGE_ENABLED');
        } else {
            putenv('COVERAGE_ENABLED=' . $this->originalFlag);
        }
        parent::tearDown();
    }

    /** Coverage dumps this middleware would write, if it were enabled. */
    private function dumpedCoverageFiles()
    {
        return glob(storage_path('coverage/*.json')) ?: [];
    }

    // With the flag off the middleware is a pass-through: the downstream response object itself is
    // what the caller gets back, not a copy and not a wrapper.
    /** @test */
    public function with_coverage_disabled_the_downstream_response_is_returned_untouched()
    {
        putenv('COVERAGE_ENABLED=false');
        $request  = Request::create('/api/attendance/summary', 'GET');
        $expected = new Response('downstream body', 201);

        $actual = $this->middleware->handle($request, function ($passed) use ($request, $expected) {
            $this->assertSame($request, $passed);       // the request is forwarded, not rebuilt
            return $expected;
        });

        $this->assertSame($expected, $actual);
        $this->assertSame('downstream body', $actual->getContent());
        $this->assertSame(201, $actual->getStatusCode());
    }

    // The flag being absent altogether behaves the same as being off — the default is inert.
    /** @test */
    public function with_the_coverage_flag_unset_the_middleware_stays_inert()
    {
        putenv('COVERAGE_ENABLED');                     // unset entirely
        $before  = $this->dumpedCoverageFiles();
        $request = Request::create('/api/department/all', 'GET');
        $calls   = 0;

        $response = $this->middleware->handle($request, function () use (&$calls) {
            $calls++;
            return new Response('ok');
        });

        $this->assertSame(1, $calls);                   // the pipeline continues exactly once
        $this->assertSame('ok', $response->getContent());
        $this->assertSame($before, $this->dumpedCoverageFiles());   // nothing dumped to disk
    }

    // Whatever the downstream throws must propagate: the disabled arm returns before the try/finally
    // block, so it adds no error handling of its own.
    /** @test */
    public function with_coverage_disabled_a_downstream_failure_propagates_unchanged()
    {
        putenv('COVERAGE_ENABLED=false');
        $request = Request::create('/api/boom', 'GET');

        try {
            $this->middleware->handle($request, function () {
                throw new \RuntimeException('downstream exploded');
            });
            $this->fail('the middleware must not swallow downstream failures');
        } catch (\RuntimeException $e) {
            $this->assertSame('downstream exploded', $e->getMessage());
        }
    }
}

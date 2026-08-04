<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for GeoController::load arms. Menu=Attendance Page=Geo.
 *
 * Single public method index() — lists the geos (countries) the caller may read. Only constructor dep is
 * the concrete AttendanceGeoGate service, IoC-mocked. The country master read UtcTimelog::orderBy(...)->get()
 * runs against the real utc_timelog lookup table (small, read-only, non-destructive) — no call_sp / external /
 * write. gate->canAccessGeo is stubbed to filter the result.
 *
 * Status codes verified against the code:
 *   success_response => 200 {message,content};
 *   catch(Exception) => error_response(..., HTTP_INTERNAL_SERVER_ERROR=500) {error:{message,content}}.
 *
 * No SKIPPED-SP / SKIPPED-EXTERNAL / SKIPPED-DESTRUCTIVE arms (endpoint is read-only).
 * // NOTE: index()'s ->get() on utc_timelog is a full read of the country-master lookup table (bounded,
 *   read-only); the success arm cannot be exercised without it. The exception arm needs >=1 country so the
 *   filter closure runs and the mocked gate throws — skipped if utc_timelog is empty.
 *
 * Route (module prefix attendance/geos, mounted under /api):
 *   GET /api/attendance/geos/  -> GeoController@index()
 */

namespace Tests\Feature\BranchTests\Attendance\Geo;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\Attendance\Services\AttendanceGeoGate;

class GeoLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    /** @var UtcTimelog */
    private $geo;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();               // reach controller body past jwtauth/auth.apikey
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->geo = UtcTimelog::first();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockGate(): \Mockery\MockInterface
    {
        $m = Mockery::mock(AttendanceGeoGate::class);
        $this->app->instance(AttendanceGeoGate::class, $m);
        return $m;
    }

    // ============================================================  index()
    // Branch: countries listed + gate filter -> success_response 200
    /** @test */
    public function index__load__success__ok_200()
    {
        $gate = $this->mockGate();
        $gate->shouldReceive('canAccessGeo')->andReturn(true);

        $res = $this->actingAs($this->user)->getJson('/api/attendance/geos/');

        $res->assertStatus(200)->assertJsonStructure(['message', 'content']);
    }

    // Branch: catch(Exception) -> error_response(HTTP_INTERNAL_SERVER_ERROR) 500
    // Needs >=1 country so the filter closure invokes the (throwing) gate.
    /** @test */
    public function index__load__exception__error_500()
    {
        if (!$this->geo) $this->markTestIncomplete('no utc_timelog country row to trigger filter closure');
        $gate = $this->mockGate();
        $gate->shouldReceive('canAccessGeo')->andThrow(new Exception('boom'));

        $res = $this->actingAs($this->user)->getJson('/api/attendance/geos/');

        $res->assertStatus(500)->assertJsonStructure(['error' => ['message', 'content']]);
    }
}

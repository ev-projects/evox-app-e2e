<?php
/**
 * SOURCE FILE UNDER TEST
 *   app/Http/Controllers/RedisController.php :: get_redis_notifications()   (64.71% before this file)
 *
 * MENU PATH
 *   Dashboard -> Notifications bell — GET /api/get_redis_notifications/{user_id}. EVOX proxies the
 *   notification payload (approvals waiting on you, your own request statuses, announcements,
 *   celebrations, missed DTRs) from a separate Redis cache sidecar over HTTP.
 *
 * WHY A USER CARES
 *   This controller's whole job is to make the bell FAIL SAFE. The sidecar is a separate service; if
 *   it is down, slow, 404s an unknown user, or returns an empty body, the dashboard must still paint
 *   with five empty lists rather than erroring. Every arm below returns the same default envelope on
 *   purpose. The one arm that must NOT default is a healthy 200 with content — that has to be handed
 *   through untouched, or the bell silently shows nothing while the cache is full.
 *
 * ARMS COVERED — both sides of every conditional
 *   - HTTP 200 with content            -> the sidecar payload is returned verbatim
 *   - HTTP 200 with content unset      -> default envelope (the isset() half of line 29)
 *   - HTTP 200 with empty content      -> default envelope (the empty() half of line 29)
 *   - HTTP 404 (unknown user)          -> default envelope (the else-if arm)
 *   - HTTP 500 (sidecar broken)        -> default envelope (the final else arm)
 *   - Curl throws (sidecar unreachable)-> default envelope (the catch arm)
 *
 * SAFETY
 *   The Ixudra Curl FACADE is mocked in every test, exactly as load.FreshServiceTicketsBranchTest
 *   does, so no HTTP request leaves the process and REDIS_SERVER_HOST is never contacted. Read-only:
 *   nothing is written and no stored procedure is reachable.
 *
 * FINDINGS
 *   REDIS-TIMEOUT-1 (pre-existing, characterized here): withTimeout(300)/withConnectTimeout(300) give
 *     the sidecar a FIVE MINUTE budget with no circuit breaker, so a hung sidecar hangs the dashboard
 *     request for five minutes before the fail-safe default is reached. Asserted structurally below
 *     (the timeouts the controller asks for are captured from the builder) rather than by waiting.
 *   REDIS-DUPARM-1 (characterized, not fixed): the `status == 404` arm and the final `else` arm have
 *     byte-identical bodies (lines 34 and 36). They are kept apart here so a future change that makes
 *     404 behave differently from 500 has a test on both.
 */

namespace Tests\Feature\BranchTests\Dashboard\Notifications;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Ixudra\Curl\Facades\Curl;
use Mockery;
use Tests\TestCase;
use App\Modules\User\Models\User;

class RedisNotificationsLoadBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** The five buckets the bell always expects, whatever the sidecar does. */
    const DEFAULT_KEYS = ['requestsForApproval', 'requestStatus', 'announcements', 'celebrations', 'missedDtr'];

    /** @var User */
    private $user;

    /** @var array captured timeouts the controller asked the Curl builder for */
    private $askedFor = [];

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();                 // past jwtauth / auth.apikey to the controller body
        $this->askedFor = [];
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestSkipped('no user row in test DB to act as');
        }
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * Stand in for the Redis sidecar. Every fluent call self-returns; get() hands back $response.
     * The endpoint the controller builds and the timeouts it asks for are captured for assertion.
     */
    private function sidecarReturns($response): void
    {
        $builder = Mockery::mock();
        $builder->shouldReceive('withHeader')->andReturnSelf();
        $builder->shouldReceive('withTimeout')->andReturnUsing(function ($s) use (&$builder) {
            $this->askedFor['timeout'] = $s;

            return $builder;
        });
        $builder->shouldReceive('withConnectTimeout')->andReturnUsing(function ($s) use (&$builder) {
            $this->askedFor['connect_timeout'] = $s;

            return $builder;
        });
        $builder->shouldReceive('returnResponseObject')->andReturnSelf();
        $builder->shouldReceive('get')->andReturn($response);

        Curl::shouldReceive('to')->andReturnUsing(function ($url) use ($builder) {
            $this->askedFor['url'] = $url;

            return $builder;
        });
    }

    /** Assert the response body is the five-bucket fail-safe default, every bucket empty. */
    private function assertDefaultEnvelope($res): void
    {
        $res->assertStatus(200);
        $body = $res->json();

        $this->assertSame(self::DEFAULT_KEYS, array_keys($body), 'the bell always gets all five buckets');
        foreach (self::DEFAULT_KEYS as $key) {
            $this->assertSame([], $body[$key], "bucket {$key} must be an empty list, never null or missing");
        }
    }

    // =====================================================  the one arm that must pass data through

    /**
     * A healthy sidecar. Whatever it returns is handed to the browser untouched — the controller must
     * not re-wrap it or substitute the default, or the bell shows nothing while the cache is full.
     *
     * @test
     */
    public function a_healthy_cache_response_is_passed_through_to_the_bell_untouched()
    {
        $payload = [
            'requestsForApproval' => [['id' => 11, 'type' => 'Overtime']],
            'requestStatus'       => [['id' => 12, 'status' => 'approved']],
            'announcements'       => [],
            'celebrations'        => [['name' => 'Birthday']],
            'missedDtr'           => [['date' => '2026-01-05']],
        ];
        $this->sidecarReturns((object) ['status' => 200, 'content' => json_encode($payload)]);

        $res = $this->getJson('/api/get_redis_notifications/' . $this->user->id);

        $res->assertStatus(200);
        $this->assertSame($payload, $res->json(), 'a populated cache payload must reach the bell unchanged');
    }

    /**
     * The cache is keyed by user id, so the proxied path must carry the id from the route — not the
     * authenticated user, and not a fixed key. Getting this wrong shows one employee another
     * employee's approvals.
     *
     * @test
     */
    public function the_cache_is_addressed_by_the_user_id_in_the_route()
    {
        $this->sidecarReturns((object) ['status' => 200, 'content' => json_encode(['requestStatus' => []])]);

        $this->getJson('/api/get_redis_notifications/4242')->assertStatus(200);

        $this->assertStringEndsWith(
            '/api/cache/4242',
            $this->askedFor['url'],
            'the sidecar must be asked for the cache of the user id in the route'
        );
    }

    /**
     * FINDING REDIS-TIMEOUT-1. Pinned rather than waited on: the controller asks for a 300-second
     * read AND connect budget, so a hung sidecar holds the dashboard request open for five minutes
     * before the fail-safe default below is ever reached.
     *
     * @test
     */
    public function the_controller_gives_the_cache_sidecar_a_five_minute_budget_with_no_circuit_breaker()
    {
        $this->sidecarReturns((object) ['status' => 200, 'content' => json_encode([])]);

        $this->getJson('/api/get_redis_notifications/' . $this->user->id);

        $this->assertSame(300, $this->askedFor['timeout'], 'FINDING REDIS-TIMEOUT-1: 300s read timeout');
        $this->assertSame(300, $this->askedFor['connect_timeout'], 'FINDING REDIS-TIMEOUT-1: 300s connect timeout');
    }

    // ==============================================================  the five fail-safe arms

    /**
     * 200 but the sidecar sent no content property at all — the isset() half of the guard.
     *
     * @test
     */
    public function a_cache_hit_with_no_content_property_falls_back_to_five_empty_buckets()
    {
        $this->sidecarReturns((object) ['status' => 200]);

        $this->assertDefaultEnvelope($this->getJson('/api/get_redis_notifications/' . $this->user->id));
    }

    /**
     * 200 with an empty body — the empty() half of the same guard. A blank cache entry must not be
     * forwarded as a blank response the front end would choke on.
     *
     * @test
     */
    public function a_cache_hit_with_an_empty_body_falls_back_to_five_empty_buckets()
    {
        $this->sidecarReturns((object) ['status' => 200, 'content' => '']);

        $this->assertDefaultEnvelope($this->getJson('/api/get_redis_notifications/' . $this->user->id));
    }

    /**
     * The user has no cache entry yet (a brand-new employee, or the cache was flushed). 404 is normal,
     * not an error — the bell paints empty.
     *
     * @test
     */
    public function an_unknown_user_in_the_cache_gets_five_empty_buckets_rather_than_an_error()
    {
        $this->sidecarReturns((object) ['status' => 404, 'content' => 'Not Found']);

        $this->assertDefaultEnvelope($this->getJson('/api/get_redis_notifications/' . $this->user->id));
    }

    /**
     * The sidecar itself is broken. FINDING REDIS-DUPARM-1: this final else arm is byte-identical to
     * the 404 arm today; kept separate so the two can diverge under test.
     *
     * @test
     */
    public function a_broken_cache_service_gets_five_empty_buckets_rather_than_an_error()
    {
        $this->sidecarReturns((object) ['status' => 500, 'content' => 'Internal Server Error']);

        $this->assertDefaultEnvelope($this->getJson('/api/get_redis_notifications/' . $this->user->id));
    }

    /**
     * The sidecar is unreachable — Curl throws before any status exists. This is the arm that keeps
     * the whole dashboard alive when the cache host is down.
     *
     * @test
     */
    public function an_unreachable_cache_service_still_lets_the_dashboard_paint()
    {
        Curl::shouldReceive('to')->andThrow(new \Exception('connection refused'));

        $this->assertDefaultEnvelope($this->getJson('/api/get_redis_notifications/' . $this->user->id));
    }
}

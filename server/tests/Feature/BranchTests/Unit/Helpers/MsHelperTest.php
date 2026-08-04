<?php

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Tests\TestCase;
use Mockery;
use Ixudra\Curl\Facades\Curl;

/**
 * WAVE-2 COVERAGE (2026-07-27). Unit tests for app/Helpers/ms_helper.php (0% before this):
 * ms_get_access_token() and ms_call_api() — the Microsoft Graph cURL wrappers.
 *
 * SAFETY: the Ixudra Curl FACADE is fully mocked in every test — no network I/O ever happens.
 * The chained builder (to→withHeader→withTimeout→withConnectTimeout→returnResponseObject→
 * withData/asJson→verb) is faked with andReturnSelf(); only the final verb returns the stub
 * response object {status, content}. log_to_file() writes to storage/logs (harmless, local).
 */
class MsHelperTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /** Build a Curl facade mock whose verb methods return the given response object. */
    private function fakeCurl($response, array $expectVerbs = ['post'])
    {
        $builder = Mockery::mock();
        foreach (['withHeader', 'withTimeout', 'withConnectTimeout', 'returnResponseObject', 'withData', 'asJson'] as $chain) {
            $builder->shouldReceive($chain)->andReturnSelf();
        }
        foreach ($expectVerbs as $verb) {
            $builder->shouldReceive($verb)->andReturn($response);
        }
        Curl::shouldReceive('to')->andReturn($builder);
        return $builder;
    }

    public function test_ms_get_access_token_returns_decoded_object_on_http_200_json()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => json_encode(['access_token' => 'abc123'])]);

        $result = ms_get_access_token('fake-tenant', ['grant_type' => 'client_credentials']);

        $this->assertIsObject($result);
        $this->assertSame('abc123', $result->access_token);
    }

    public function test_ms_get_access_token_returns_raw_content_when_body_is_not_json()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => 'plain-text-token']);

        // no data param -> withData() must NOT be required on this path
        $result = ms_get_access_token('fake-tenant');

        $this->assertSame('plain-text-token', $result);
    }

    public function test_ms_get_access_token_returns_null_on_non_200()
    {
        $this->fakeCurl((object) ['status' => 401, 'content' => 'unauthorized']);

        $this->assertNull(ms_get_access_token('fake-tenant', ['a' => 'b']));
    }

    public function test_ms_call_api_get_returns_decoded_json()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => json_encode(['value' => [1, 2]])], ['get']);

        $result = ms_call_api('tok', 'GET', '/users');

        $this->assertIsObject($result);
        $this->assertSame([1, 2], $result->value);
    }

    public function test_ms_call_api_post_success_returns_true_not_body()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => json_encode(['id' => 9])], ['post']);

        // POST arm: on HTTP 200 the helper returns boolean true, discarding the body
        $this->assertTrue(ms_call_api('tok', 'POST', '/users', ['name' => 'x'], true));
    }

    public function test_ms_call_api_put_success_returns_true()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => ''], ['put']);

        $this->assertTrue(ms_call_api('tok', 'PUT', '/users/1', ['name' => 'y']));
    }

    public function test_ms_call_api_patch_returns_content_when_not_json()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => 'ok'], ['patch']);

        $this->assertSame('ok', ms_call_api('tok', 'PATCH', '/users/1', ['name' => 'z']));
    }

    public function test_ms_call_api_delete_returns_decoded_json()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => json_encode(['deleted' => true])], ['delete']);

        $result = ms_call_api('tok', 'DELETE', '/users/1');

        $this->assertTrue($result->deleted);
    }

    public function test_ms_call_api_unknown_method_falls_back_to_get()
    {
        $this->fakeCurl((object) ['status' => 200, 'content' => json_encode(['fallback' => 1])], ['get']);

        $result = ms_call_api('tok', 'HEAD', '/ping');

        $this->assertSame(1, $result->fallback);
    }

    public function test_ms_call_api_returns_null_on_non_200()
    {
        $this->fakeCurl((object) ['status' => 500, 'content' => 'boom'], ['get']);

        $this->assertNull(ms_call_api('tok', 'GET', '/broken'));
    }
}

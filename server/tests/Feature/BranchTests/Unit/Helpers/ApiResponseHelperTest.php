<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. PURE UNIT tests for the API response helpers.
 *
 * Source of truth (LATEST only):
 *   ...\coverage-max\latest-code\server\app\Helpers\api_response_helper.php
 *
 * Functions under test (both build an Illuminate\Http\JsonResponse via response()->json):
 *   success_response($message, $content=[], $http_code=200) -> 200 {message, content}
 *   error_response($message,   $content=[], $error_code=400) -> {error:{message, content}};
 *       if $content instanceof Exception it is unwrapped to $content->getMessage().
 *
 * NO DB / NO SP / NO external. Only the framework response factory is exercised. Assertions read
 * the JsonResponse status code + decoded payload directly (no HTTP round-trip needed).
 */

namespace Tests\Feature\BranchTests\Unit\Helpers;

use Exception;
use RuntimeException;
use Tests\TestCase;
use Illuminate\Http\JsonResponse;

class ApiResponseHelperTest extends TestCase
{
    // ========================================================= success_response()

    // Normal: message only -> 200, {message, content:[]} (default content is empty array).
    /** @test */
    public function success_response__message_only__200_shape()
    {
        $res = success_response('done');

        $this->assertInstanceOf(JsonResponse::class, $res);
        $this->assertSame(200, $res->getStatusCode());
        $this->assertSame(['message' => 'done', 'content' => []], $res->getData(true));
    }

    // Normal: message + array content is passed through untouched.
    /** @test */
    public function success_response__with_content__content_preserved()
    {
        $res = success_response('ok', ['id' => 7, 'name' => 'x']);

        $this->assertSame(200, $res->getStatusCode());
        $this->assertSame(['message' => 'ok', 'content' => ['id' => 7, 'name' => 'x']], $res->getData(true));
    }

    // Edge: explicit non-200 http_code is honoured (e.g. 201 Created).
    /** @test */
    public function success_response__custom_http_code__honoured()
    {
        $res = success_response('created', ['a' => 1], JsonResponse::HTTP_CREATED);

        $this->assertSame(201, $res->getStatusCode());
        $this->assertSame(['message' => 'created', 'content' => ['a' => 1]], $res->getData(true));
    }

    // Edge: array message is allowed (docblock says string|array).
    /** @test */
    public function success_response__array_message__preserved()
    {
        $res = success_response(['line1', 'line2']);

        $this->assertSame(['message' => ['line1', 'line2'], 'content' => []], $res->getData(true));
    }

    // =========================================================== error_response()

    // Normal: message only -> 400, {error:{message, content:[]}}.
    /** @test */
    public function error_response__message_only__400_shape()
    {
        $res = error_response('bad request');

        $this->assertInstanceOf(JsonResponse::class, $res);
        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame(['error' => ['message' => 'bad request', 'content' => []]], $res->getData(true));
    }

    // Normal: string content is passed through unchanged.
    /** @test */
    public function error_response__string_content__preserved()
    {
        $res = error_response('nope', 'detail-string');

        $this->assertSame(['error' => ['message' => 'nope', 'content' => 'detail-string']], $res->getData(true));
    }

    // Edge: Exception content is unwrapped to getMessage() (the branch under test).
    /** @test */
    public function error_response__exception_content__unwrapped_to_message()
    {
        $res = error_response('failed', new Exception('boom detail'));

        $this->assertSame(400, $res->getStatusCode());
        $this->assertSame(['error' => ['message' => 'failed', 'content' => 'boom detail']], $res->getData(true));
    }

    // Edge: a subclass of Exception is also unwrapped (instanceof Exception covers subclasses).
    /** @test */
    public function error_response__exception_subclass__unwrapped()
    {
        $res = error_response('failed', new RuntimeException('runtime boom'));

        $this->assertSame(['error' => ['message' => 'failed', 'content' => 'runtime boom']], $res->getData(true));
    }

    // Boundary: explicit error_code is honoured (e.g. 422 Unprocessable Entity).
    /** @test */
    public function error_response__custom_error_code__honoured()
    {
        $res = error_response('invalid', ['field' => 'x'], JsonResponse::HTTP_UNPROCESSABLE_ENTITY);

        $this->assertSame(422, $res->getStatusCode());
        $this->assertSame(['error' => ['message' => 'invalid', 'content' => ['field' => 'x']]], $res->getData(true));
    }
}

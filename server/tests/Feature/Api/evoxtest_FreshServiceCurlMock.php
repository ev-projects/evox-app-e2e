<?php

namespace Tests\Feature\Api;

/**
 * evoxtest_FreshServiceCurlMock.php
 *
 * IoC replacement for Ixudra\Curl\Facades\Curl in FreshService controller tests.
 *
 * Usage in setUp():
 *   \Ixudra\Curl\Facades\Curl::swap(new \Tests\Feature\Api\evoxtest_FreshServiceCurlMock());
 *
 * Error mode (tests the controller's non-200 branch):
 *   evoxtest_FreshServiceCurlMock::useErrorMode();
 *   // ... make request ...
 *   evoxtest_FreshServiceCurlMock::useSuccessMode(); // reset after
 *
 * Returns predictable stdClass responses that match what the real FreshService API
 * returns, without opening any network socket. Eliminates the 30 s Curl timeouts.
 *
 * getMyTickets returns 2 mock tickets (as requested).
 */
class evoxtest_FreshServiceCurlMock
{
    /** @var bool When true, all Curl calls return 422 to exercise the error branch. */
    private static bool $errorMode = false;

    public static function useErrorMode(): void  { self::$errorMode = true; }
    public static function useSuccessMode(): void { self::$errorMode = false; }
    public static function isErrorMode(): bool    { return self::$errorMode; }

    public function to(string $url): evoxtest_FreshServiceCurlBuilder
    {
        return new evoxtest_FreshServiceCurlBuilder($url, self::$errorMode);
    }
}

/**
 * Fluent builder that mirrors Ixudra\Curl\CurlBuilder's chain API.
 * Every chain method returns $this. get() / post() return the fake response.
 */
class evoxtest_FreshServiceCurlBuilder
{
    private string $url;
    private bool   $errorMode;

    public function __construct(string $url, bool $errorMode)
    {
        $this->url       = $url;
        $this->errorMode = $errorMode;
    }

    // ── chain methods (all no-ops, return $this) ──────────────────────────────
    public function withHeader($h):          self { return $this; }
    public function withTimeout($t):         self { return $this; }
    public function withConnectTimeout($t):  self { return $this; }
    public function returnResponseObject():  self { return $this; }
    public function asJson():                self { return $this; }
    public function withData($d):            self { return $this; }

    // ── terminal methods ───────────────────────────────────────────────────────
    public function get():  \stdClass { return $this->resolve('GET'); }
    public function post(): \stdClass { return $this->resolve('POST'); }

    // ── response factory ───────────────────────────────────────────────────────
    private function resolve(string $method): \stdClass
    {
        if ($this->errorMode) {
            return $this->errorResponse('FreshService rejected the request.');
        }

        $url = $this->url;

        // POST /tickets?userEmail=... → createTicket
        if ($method === 'POST' && strpos($url, '/tickets?') !== false) {
            $ticket             = new \stdClass();
            $ticket->id         = 88001;
            $ticket->requester_id = 10001;
            $ticket->created_at = '2026-08-13T00:00:00.000Z';
            $ticket->workspace_id = 1;
            return $this->successResponse((object)['ticket' => $ticket]);
        }

        // POST .../reply?userEmail=... → sendTicketConversation
        if ($method === 'POST' && strpos($url, '/reply') !== false) {
            $conv       = new \stdClass();
            $conv->id   = 55001;
            $conv->body = 'E2E mock reply';
            return $this->successResponse((object)['conversation' => $conv]);
        }

        // POST .../attachments → saveAttachment
        if ($method === 'POST' && strpos($url, '/attachments') !== false) {
            $att     = new \stdClass();
            $att->id = 77001;
            return $this->successResponse((object)['attachment' => $att]);
        }

        // GET .../my-tickets?... → getMyTickets (returns 2 tickets)
        if (strpos($url, '/my-tickets') !== false) {
            $t1               = new \stdClass();
            $t1->id           = 88001;
            $t1->subject      = 'E2E Mock Ticket Alpha';
            $t1->status       = 2;
            $t1->workspace_id = 1;
            $t1->requester_id = 10001;
            $t1->created_at   = '2026-08-01T08:00:00.000Z';

            $t2               = new \stdClass();
            $t2->id           = 88002;
            $t2->subject      = 'E2E Mock Ticket Beta';
            $t2->status       = 3;
            $t2->workspace_id = 1;
            $t2->requester_id = 10001;
            $t2->created_at   = '2026-08-05T08:00:00.000Z';

            return $this->successResponse((object)['tickets' => [$t1, $t2], 'total' => 2]);
        }

        // GET .../conversations?userEmail=... → getTicketConversation
        if (strpos($url, '/conversations') !== false) {
            $conv       = new \stdClass();
            $conv->id   = 55001;
            $conv->body = 'E2E mock conversation entry';
            return $this->successResponse((object)['conversations' => [$conv]]);
        }

        // GET /tickets/{id}?userEmail=... → getTicket
        if (preg_match('#/tickets/\d+\?#', $url)) {
            $ticket               = new \stdClass();
            $ticket->id           = 88001;
            $ticket->subject      = 'E2E Mock Ticket Alpha';
            $ticket->status       = 2;
            $ticket->workspace_id = 1;
            $ticket->requester_id = 10001;
            return $this->successResponse((object)['ticket' => $ticket]);
        }

        // Fallback — return 200 with empty content
        return $this->successResponse(new \stdClass());
    }

    private function successResponse($content): \stdClass
    {
        $res          = new \stdClass();
        $res->status  = 200;
        $res->content = $content;
        return $res;
    }

    private function errorResponse(string $message): \stdClass
    {
        $res                   = new \stdClass();
        $res->status           = 422;
        $res->content          = new \stdClass();
        $res->content->message = $message;
        return $res;
    }
}

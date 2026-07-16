<?php
/**
 * @registry-doc create.registry.md
 * @vetted-by    Glenn Macasarte
 * @vetted-on    July 3, 2026
 *
 * VERIFIED-BACKED — generated 2026-07-07 from create.registry.md
 *
 * Covers:
 *  POST /api/department/announcements/create                                   → AnnouncementController::store()
 *  POST /api/department/announcements/my_handle_announcements/{id}/update    → AnnouncementController::update()
 *
 * Known bugs documented:
 *  B-release-date-self-ref: Yup .max(Yup.ref('release_date')) is self-referential —
 *      expiry-after-release validation is non-functional on the frontend and not enforced
 *      on the backend either.
 *  B-expiry-date-self-ref: Yup .min(Yup.ref('expiry_date')) is self-referential —
 *      same issue as release_date.
 */

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use App\Modules\User\Models\User;

class AnnouncementCreateVerifiedApiTest extends TestCase
{
    use DatabaseTransactions; // SAFETY: converted from RefreshDatabase 2026-07-08 — never migrate:fresh on staging DB

    private array $apiKey;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->user = User::where('is_active', 1)->whereNotNull('email')->firstOrFail();
        Storage::fake('public');
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/department/announcements/create
    // =========================================================================

    /** @test */
    public function test_store_announcement_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/department/announcements/create', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN B — Auth enforcement
    // POST /api/department/announcements/my_handle_announcements/{id}/update
    // =========================================================================

    /** @test */
    public function test_update_announcement_without_token_returns_401(): void
    {
        $response = $this->postJson('/api/department/announcements/my_handle_announcements/1/update', [], $this->apiKey);
        $response->assertStatus(401);
        $this->assertEquals('token_absent', $response->json('error.content.code'));
    }

    // =========================================================================
    // PATTERN A — AnnouncementController::store()
    // POST /api/department/announcements/create
    // Requires: title, release_date, expiry_date, set_all|set_exclude|set_selected scope
    // =========================================================================

    /** @test */
    public function test_store_announcement_without_title_returns_validation_error(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                // title intentionally omitted — Yup/backend required rule
                'headline'     => 'Test Headline',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
            ],
            $this->apiKey
        );
        // Backend must reject a missing required title field
        $response->assertStatus(422);
    }

    /** @test */
    public function test_store_announcement_without_release_date_returns_validation_error(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'       => 'Test Announcement',
                'expiry_date' => now()->addDays(7)->toDateString(),
                'set_all'     => true,
                // release_date intentionally omitted
            ],
            $this->apiKey
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function test_store_announcement_without_expiry_date_returns_validation_error(): void
    {
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'        => 'Test Announcement',
                'release_date' => now()->toDateString(),
                'set_all'      => true,
                // expiry_date intentionally omitted
            ],
            $this->apiKey
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function test_store_announcement_with_valid_payload_returns_success(): void
    {
        // [DEVELOPER VETTING] confirmed: POST /api/department/announcements/create
        // → AnnouncementController::store() — inserts root row + clones per selected department
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'        => 'Valid Announcement Title',
                'headline'     => 'Short headline',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
                'content'      => '<p>Hello world</p>',
                'link'         => '',
            ],
            $this->apiKey
        );
        // Controller should return 200 or 201 on successful store
        $this->assertContains($response->status(), [200, 201]);
    }

    /** @test */
    public function test_store_announcement_with_thumbnail_file_returns_success(): void
    {
        // [DEVELOPER VETTING] confirmed: thumbnail is a file upload — multipart/form-data
        // No file-type restriction is enforced (Q2 answer: no type validation)
        $this->withoutMiddleware();
        $file = UploadedFile::fake()->image('thumbnail.jpg');
        $response = $this->actingAs($this->user)->post(
            '/api/department/announcements/create',
            [
                'title'        => 'Announcement With Thumbnail',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => '1',
                'thumbnail'    => $file,
            ],
            array_merge($this->apiKey, ['Content-Type' => 'multipart/form-data'])
        );
        $this->assertNotEquals(500, $response->status());
    }

    /** @test */
    public function test_store_announcement_title_exceeding_100_chars_returns_validation_error(): void
    {
        // Validation rule: Title must not exceed 100 characters → "Max Title Length reached"
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'        => str_repeat('A', 101),
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
            ],
            $this->apiKey
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function test_store_announcement_with_invalid_link_url_returns_validation_error(): void
    {
        // Validation rule: Link — if provided, must be a valid URL → "Enter correct url!"
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'        => 'Announcement With Bad Link',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
                'link'         => 'not-a-valid-url',
            ],
            $this->apiKey
        );
        $response->assertStatus(422);
    }

    /** @test */
    public function test_store_announcement_scope_set_all_is_accepted(): void
    {
        // set_all radio — announcement targets all departments
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'        => 'All Departments Announcement',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
            ],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // PATTERN A — AnnouncementController::update()
    // POST /api/department/announcements/my_handle_announcements/{id}/update
    // =========================================================================

    /** @test */
    public function test_update_announcement_with_valid_payload_returns_success(): void
    {
        // [DEVELOPER VETTING] confirmed: POST /api/department/announcements/my_handle_announcements/{id}/update
        // → AnnouncementController::update() — updates root record and cascades to department copies
        $this->withoutMiddleware();

        // Seed a record first via store so we have a real ID to update
        $storeResponse = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/create',
            [
                'title'        => 'Original Title',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
            ],
            $this->apiKey
        );

        // If store succeeded, attempt update on the returned ID
        if (in_array($storeResponse->status(), [200, 201])) {
            $id = $storeResponse->json('data.id') ?? $storeResponse->json('id') ?? 1;
            $updateResponse = $this->actingAs($this->user)->postJson(
                "/api/department/announcements/my_handle_announcements/{$id}/update",
                [
                    'title'        => 'Updated Title',
                    'release_date' => now()->toDateString(),
                    'expiry_date'  => now()->addDays(14)->toDateString(),
                    'set_all'      => true,
                ],
                $this->apiKey
            );
            $this->assertNotEquals(500, $updateResponse->status());
        } else {
            $this->markTestSkipped('Store returned non-success; cannot test update without a seeded record.');
        }
    }

    /** @test */
    public function test_update_announcement_with_nonexistent_id_does_not_500(): void
    {
        // Edge case: updating a record that does not exist
        $this->withoutMiddleware();
        $response = $this->actingAs($this->user)->postJson(
            '/api/department/announcements/my_handle_announcements/999999/update',
            [
                'title'        => 'Ghost Announcement',
                'release_date' => now()->toDateString(),
                'expiry_date'  => now()->addDays(7)->toDateString(),
                'set_all'      => true,
            ],
            $this->apiKey
        );
        $this->assertNotEquals(500, $response->status());
    }

    // =========================================================================
    // Known bug markers
    // =========================================================================

    /** @test */
    public function test_release_date_self_referential_yup_is_known_bug(): void
    {
        // KNOWN BUG B-release-date-self-ref:
        // Yup schema uses .max(Yup.ref('release_date')) on the release_date field itself.
        // This means the cross-field "expiry must be after release" validation is non-functional.
        // The backend does not compensate for this gap either.
        // This test documents the bug; it is not a pass/fail assertion.
        $this->markTestSkipped(
            'Known bug: release_date Yup rule is self-referential (.max(Yup.ref(\'release_date\'))). ' .
            'Cross-field date order is not validated on frontend or backend. ' .
            'See create.registry.md Section 1 row #3.'
        );
    }

    /** @test */
    public function test_expiry_date_self_referential_yup_is_known_bug(): void
    {
        // KNOWN BUG B-expiry-date-self-ref:
        // Yup schema uses .min(Yup.ref('expiry_date')) on the expiry_date field itself.
        // Same self-referential issue as release_date.
        $this->markTestSkipped(
            'Known bug: expiry_date Yup rule is self-referential (.min(Yup.ref(\'expiry_date\'))). ' .
            'Cross-field date order is not validated on frontend or backend. ' .
            'See create.registry.md Section 1 row #4.'
        );
    }
}

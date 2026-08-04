<?php
// HAPPY-PATH test — Announcement Create (dept + HR forms share this one endpoint).
// set_all=1 and set_country_all=1 so selectedDepartments/country_id aren't required,
// and on_link=false so link isn't required — the minimal fully-valid payload.
// Confirmed via AnnouncementRepository::store() that set_all=1 skips the per-department
// pivot-row loop entirely (only the single `announcements` row is written), and no
// external side effects (no mail/queue) are triggered by this endpoint.
// DatabaseTransactions rolls back — safe on the disposable DB.

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AnnouncementHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::find(1593) ?? User::where('is_active', 1)->first();
        if (!$this->user) {
            $this->markTestIncomplete('no user available in test DB');
        }
    }

    /** @test */
    public function creates_an_announcement_visible_to_all_departments()
    {
        $title = 'HappyPath Announcement ' . time();

        $payload = [
            'release_date' => date('Y-m-d'),
            'expiry_date' => date('Y-m-d', strtotime('+7 days')),
            'title' => $title,
            'content' => 'E2E test announcement body',
            'set_all' => 1,
            'set_country_all' => 1,
            'on_link' => false,
        ];

        $response = $this->actingAs($this->user)->postJson('/api/department/announcements/create', $payload);

        $response->assertSuccessful();

        $this->assertDatabaseHas('announcements', [
            'title' => $title,
            'set_all' => 1,
        ]);
    }
}

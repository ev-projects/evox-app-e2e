<?php
// DEEPER validation — Announcement CONTROLLER / BUSINESS / DB-layer rules (beyond the
// FormRequest datatype layer in AnnouncementValidationRejectionTest). Per matrices/
// announcement.md, code inspection of AnnouncementController@store and
// AnnouncementRepository::store() found NO uniqueness/overlap/period business rule and no
// relevant AFTER-INSERT/UPDATE trigger fires on rejection (triggers on `announcements` only
// fire after a successful write). So the only additional depth available here is the DB-layer
// proof the shallow suite doesn't do: a rejected submission writes zero rows to
// `announcements`, confirming AnnouncementRepository::store() genuinely never runs.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class AnnouncementBusinessRuleRejectionTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) { $this->markTestSkipped('no user available in test DB'); }
    }

    private function postAnnouncement(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/department/announcements/create', $payload);
    }

    /** @test — a rejected announcement (missing title) writes zero rows to `announcements`. */
    public function rejects_missing_title_and_writes_nothing()
    {
        $before = DB::table('announcements')->count();

        $this->postAnnouncement([
            'release_date' => date('Y-m-d'),
            'expiry_date'  => date('Y-m-d', strtotime('+7 days')),
            // title omitted
        ])->assertStatus(422);

        $after = DB::table('announcements')->count();
        $this->assertSame($before, $after, 'a rejected announcement must not write an announcements row');
    }

    /** @test — same DB-layer proof for the set_all/selectedDepartments cross-field rule. */
    public function rejects_set_all_zero_without_departments_and_writes_nothing()
    {
        $before = DB::table('announcements')->count();

        $this->postAnnouncement([
            'release_date' => date('Y-m-d'),
            'expiry_date'  => date('Y-m-d', strtotime('+7 days')),
            'title'        => 'Business Rule Rejection Probe',
            'set_all'      => 0,
            // selectedDepartments omitted
        ])->assertStatus(422);

        $after = DB::table('announcements')->count();
        $this->assertSame($before, $after, 'a rejected announcement must not write an announcements row');
    }

    /** @test */
    public function no_business_rule_beyond_formrequest_is_documented()
    {
        $this->markTestSkipped(
            'Code inspection of AnnouncementController@store / AnnouncementRepository::store() ' .
            'found no uniqueness/overlap/period business rule beyond AnnouncementRequest — the ' .
            'FormRequest layer (already covered by AnnouncementValidationRejectionTest) is the ' .
            'full validation surface for this form. See matrices/announcement.md.'
        );
    }
}

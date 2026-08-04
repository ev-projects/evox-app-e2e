<?php
// Validation REJECTION tests — Announcement (Department + HR forms share one endpoint/
// FormRequest). Every case sends INVALID data and asserts AnnouncementRequest blocks it
// (422). A rejected request never reaches AnnouncementRepository::store(), so this is safe
// on the live-dump DB. See matrices/announcement.md.

namespace Tests\Feature\Validation;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AnnouncementValidationRejectionTest extends TestCase
{
    use DatabaseTransactions; // never RefreshDatabase — live backup dump

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) {
            $this->markTestIncomplete('no user available in test DB');
        }
    }

    private function postAnnouncement(array $payload)
    {
        return $this->actingAs($this->user)->postJson('/api/department/announcements/create', $payload);
    }

    private function base(array $override = [])
    {
        return array_merge([
            'release_date' => date('Y-m-d'),
            'expiry_date'  => date('Y-m-d', strtotime('+7 days')),
            'title'        => 'Validation Rejection Test Announcement',
        ], $override);
    }

    /** @test */ public function rejects_missing_release_date()
    { $p = $this->base(); unset($p['release_date']); $this->postAnnouncement($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_release_date_format()
    { $this->postAnnouncement($this->base(['release_date' => '07/09/2026']))->assertStatus(422); }

    /** @test */ public function rejects_missing_expiry_date()
    { $p = $this->base(); unset($p['expiry_date']); $this->postAnnouncement($p)->assertStatus(422); }

    /** @test */ public function rejects_bad_expiry_date_format()
    { $this->postAnnouncement($this->base(['expiry_date' => '07/16/2026']))->assertStatus(422); }

    /** @test */ public function rejects_missing_title()
    { $p = $this->base(); unset($p['title']); $this->postAnnouncement($p)->assertStatus(422); }

    /** @test */ public function rejects_on_link_without_link()
    { $this->postAnnouncement($this->base(['on_link' => 'true']))->assertStatus(422); }

    /** @test */ public function rejects_set_all_zero_without_selected_departments()
    { $this->postAnnouncement($this->base(['set_all' => 0]))->assertStatus(422); }

    /** @test */ public function rejects_set_country_all_zero_without_country_id()
    { $this->postAnnouncement($this->base(['set_country_all' => 0]))->assertStatus(422); }
}

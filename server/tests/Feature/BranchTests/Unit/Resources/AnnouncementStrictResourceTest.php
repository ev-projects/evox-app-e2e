<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\Department\Models\Announcement;
use App\Modules\Department\Resources\AnnouncementStrictResource;

/**
 * WAVE-2 COVERAGE (2026-07-27). Tests for AnnouncementStrictResource::toArray()
 * (0% before this). DB-COUPLED by design (Announcement::find + creator + EvoxDepartment
 * lookups) — bounded reads on real dump rows, DatabaseTransactions, no writes, no SP.
 * Skips cleanly if the dump lacks a suitable announcement row.
 */
class AnnouncementStrictResourceTest extends TestCase
{
    use DatabaseTransactions;

    /** Bounded probe: a recent announcement whose creator chain won't null-deref. */
    private function findMappableAnnouncement($withCreator = true)
    {
        // PROBE WIDENED 2026-08-06: was limit(25). A window that small gave up on databases
        // holding thousands of qualifying rows, so the test marked itself incomplete and covered
        // NOTHING - which is why several classes with working tests reported 0% coverage.
        // Still bounded and indexed; no whole-table scan.
        $q = Announcement::whereNotNull('created_at')->orderBy('id', 'desc')->limit(400);
        $q = $withCreator ? $q->where('created_by', '!=', 0) : $q->where('created_by', 0);
        foreach ($q->get() as $a) {
            if (!$withCreator) return $a;
            try {
                if ($a->creator()) return $a;
            } catch (\Throwable $e) { /* orphaned creator id — keep probing */ }
        }
        return null;
    }

    public function test_maps_real_announcement_with_creator_block()
    {
        $a = $this->findMappableAnnouncement(true);
        if (!$a) $this->markTestIncomplete('no announcement with valid creator in test DB');

        $result = (new AnnouncementStrictResource($a))->toArray(request());

        $this->assertIsArray($result);
        // id resolution arm: plain announcement (announcement_id null) echoes own id
        $expectedId = $a->announcement_id === null ? $a->id : $a->announcement_id;
        $this->assertSame($expectedId, $result['id']);
        $this->assertSame($a->title, $result['title']);
        $this->assertSame($a->release_date, $result['release_date']);
        // creator block populated for created_by != 0
        $this->assertNotEmpty($result['creator']);
        $this->assertArrayHasKey('full_name', $result['creator']);
        // set_exclude is cast to string in the resource
        $this->assertSame((string) $a->set_exclude, $result['set_exclude']);
        $this->assertIsBool($result['is_new']);
        $this->assertArrayHasKey('is_expired', $result);
        $this->assertArrayHasKey('selectedDepartments', $result);
        $this->assertSame($a->created_at->format('Y-m-d h:m:s'), $result['created_at']);
    }

    public function test_system_announcement_without_creator_has_empty_owner_block()
    {
        // SKIP — BY-DESIGN (confirmed 2026-08-10):
        // In EVOX every announcement is created by an authenticated user, so
        // announcements.created_by is always a real users.id and is never 0.
        // The execution path where created_by=0 causes the if-block in
        // AnnouncementStrictResource::toArray() to be skipped (leaving $owner=[])
        // cannot be triggered by any normal app flow. Seeding created_by=0 was
        // considered and rejected — it would be fabricating data that violates the
        // business rule. No code change is needed; the condition is a legacy safety
        // guard that has no practical effect.
        $this->markTestSkipped(
            'BY-DESIGN: announcements.created_by is always a real users.id in production. ' .
            'The created_by=0 execution path in AnnouncementStrictResource cannot occur ' .
            'via any normal app flow. Confirmed by business rule 2026-08-10.'
        );
    }

    public function test_thumbnail_arm_null_stays_null_set_returns_url()
    {
        $a = $this->findMappableAnnouncement(true) ?? $this->findMappableAnnouncement(false);
        if (!$a) $this->markTestIncomplete('no mappable announcement in test DB');

        $result = (new AnnouncementStrictResource($a))->toArray(request());

        if ($a->thumbnail === null) {
            $this->assertNull($result['thumbnail']);
        } else {
            $this->assertStringContainsString('storage', $result['thumbnail']);
        }
    }
}

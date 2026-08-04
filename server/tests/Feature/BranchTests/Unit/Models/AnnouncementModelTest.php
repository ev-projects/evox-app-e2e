<?php

namespace Tests\Feature\BranchTests\Unit\Models;

use Carbon\Carbon;
use Tests\TestCase;
use App\Modules\Department\Models\Announcement;

/**
 * Pure logic test.
 * Announcement::is_expired() compares expiry_date against now. No DB access.
 */
class AnnouncementModelTest extends TestCase
{
    public function test_past_expiry_date_is_expired()
    {
        $announcement = new Announcement();
        $announcement->expiry_date = Carbon::now()->subDay()->toDateTimeString();

        $this->assertTrue($announcement->is_expired());
    }

    public function test_future_expiry_date_is_not_expired()
    {
        $announcement = new Announcement();
        $announcement->expiry_date = Carbon::now()->addDay()->toDateTimeString();

        $this->assertFalse($announcement->is_expired());
    }
}

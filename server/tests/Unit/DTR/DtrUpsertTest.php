<?php

namespace Tests\Unit\DTR;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class DtrUpsertTest extends TestCase
{
    /** @test */
    public function it_has_existing_dtr_for_user()
    {
        $userId = $this->userId();
        $date = $this->scenarioDate();

        $exists = DB::table('dtrs')
            ->where('user_id', $userId)
            ->where('date', $date)
            ->exists();

        $this->assertTrue($exists);
    }

    /** @test */
    public function it_has_single_dtr_record_per_user_per_date()
    {
        $userId = $this->userId();
        $date = $this->scenarioDate();

        $count = DB::table('dtrs')
            ->where('user_id', $userId)
            ->where('date', $date)
            ->count();

        $this->assertEquals(1, $count);
    }

    /** @test */
    public function it_validates_dtr_time_out_is_consistent_or_updated()
    {
        $userId = $this->userId();
        $date = $this->scenarioDate();

        $dtr = DB::table('dtrs')
            ->where('user_id', $userId)
            ->where('date', $date)
            ->first();

        $this->assertNotNull($dtr);

        $this->assertTrue(
            $dtr->time_out === null || $dtr->time_out > 0
        );
    }
}
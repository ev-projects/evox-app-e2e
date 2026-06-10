<?php

namespace Tests\Unit\Attendance;

use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use Tests\TestCase;
use App\Modules\Payroll\Repositories\DtrRepository;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class SyncBiometricsToDtrTest extends TestCase
{
    protected DtrRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repo = app()->make(DtrRepository::class);
    }

    /** @test */
    public function it_syncs_biometrics_using_user_and_date()
    {
        $user = $this->user();
        $date = $this->scenarioDate();
        $this->actingAs($user);
        $dtr = Dtr::where('user_id', Auth::user()->id) ->whereDate('date', $date)->first();

        $biometrix_collection = Collection::make();
        $biometrix_collection->push($this->makeBio($user, 'I', $this->timeAt('01:00:00')));
        $biometrix_collection->push($this->makeBio($user, 'O', $this->timeAt('09:00:00')));

        $result = $this->repo->sync_biometrics_to_dtr($biometrix_collection, $dtr ? $dtr->id : null);

        $this->assertInstanceOf(Collection::class, $result);
    }

    private function makeBio($user, string $type, string $datetime): Biometrics
    {
        $bio = new Biometrics();

        $bio->Userid = $this->biometricUserId($user);
        $bio->CheckType = $type;
        $bio->CheckTime = $datetime;

        return $bio;
    }
}
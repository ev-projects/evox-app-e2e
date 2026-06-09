<?php

namespace Tests\Feature\API\DTR;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\ApiTestCase;

class QuickPunchMultiTest extends ApiTestCase
{
    protected $endpoint = '/api/dtr/quickpunch_multi';

    /** @test */
    public function mqp_001_complete_punch_flow()
    {
        // IN
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'in'
            ]
        );

        $response->assertStatus(200);

        // PAUSE
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch'   => 'pause',
                'project_name' => 'EVOX',
                'remarks'      => 'Testing'
            ]
        );

        $response->assertStatus(200);

        // CONTINUE
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'continue'
            ]
        );

        $response->assertStatus(200);

        // INVALID
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch' => 'x'
            ]
        );

        $response->assertStatus(400);

        // OUT
        $response = $this->authenticatedPost(
            $this->endpoint,
            [
                'quickpunch'   => 'out',
                'project_name' => 'EVOX',
                'remarks'      => 'Testing'
            ]
        );

        $response->assertStatus(200);

        dump(
            DB::table('dtr_collective_punch_history_new')
                ->where('created_at', '>', Carbon::now()->subMinute(5))
                ->get()
        );
    }
}
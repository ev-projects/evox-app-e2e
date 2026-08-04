<?php

namespace Tests\Feature\BranchTests\Unit\Resources;

use Tests\TestCase;
use App\Modules\User\Resources\JobInformationResource;

/**
 * Pure toArray() transformation test.
 * JobInformationResource maps job-history rows and filters out the
 * zero-date sentinel ("0000-00-00").
 */
class JobInformationResourceTest extends TestCase
{
    public function test_maps_each_job_information_row()
    {
        $rows = [
            (object) [
                'date' => '2025-01-01',
                'location' => 'Manila',
                'department' => 'Engineering',
                'jobTitle' => 'Developer',
                'reportsTo' => 'Team Lead',
            ],
        ];

        $result = (new JobInformationResource($rows))->toArray(request());

        $this->assertCount(1, $result);
        $this->assertSame([
            'date' => '2025-01-01',
            'location' => 'Manila',
            'department' => 'Engineering',
            'jobTitle' => 'Developer',
            'reportsTo' => 'Team Lead',
        ], $result[0]);
    }

    public function test_zero_date_rows_are_skipped()
    {
        $rows = [
            (object) [
                'date' => '0000-00-00',
                'location' => 'N/A',
                'department' => 'N/A',
                'jobTitle' => 'N/A',
                'reportsTo' => 'N/A',
            ],
            (object) [
                'date' => '2025-06-01',
                'location' => 'Cebu',
                'department' => 'Support',
                'jobTitle' => 'Agent',
                'reportsTo' => 'Supervisor',
            ],
        ];

        $result = (new JobInformationResource($rows))->toArray(request());

        $this->assertCount(1, $result);
        $this->assertSame('2025-06-01', $result[0]['date']);
    }

    public function test_empty_input_returns_empty_array()
    {
        $result = (new JobInformationResource([]))->toArray(request());

        $this->assertSame([], $result);
    }
}

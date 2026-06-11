<?php

namespace Tests\Unit\Attendance;

use Tests\TestCase;
use App\Modules\Payroll\Repositories\DtrRepository;

class BindLeavesToDtrTest extends TestCase
{
    protected DtrRepository $repo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->repo = app()->make(DtrRepository::class);
    }

    /** @test */
    public function it_processes_approved_leave()
    {
        $user = $this->user();

        $date = $this->scenarioDate();

        $leave = (object)[
            'id' => 1,
            'employeeId' => $user->bhr_num,
            'start' => $date,
            'end' => $date,
            'dates' => (object)[
                $date => 1
            ],
            'type' => (object)[
                'name' => 'Vacation Leave'
            ],
            'status' => (object)[
                'status' => 'approved',
                'lastChangedByUserId' => 0
            ],
            'notes' => (object)[
                'employee' => 'Employee note',
                'manager' => 'Manager note'
            ],
            'amount' => (object)[
                'amount' => 1
            ]
        ];
        $result = $this->repo->bind_leaves_to_dtr(
            [$leave],
            2
        );

        $this->assertIsArray($result);
        $this->assertCount(1, $result);

        $this->assertEquals(
            'Vacation Leave',
            $result[0]['leave_type']
        );

        $this->assertEquals(
            $user->emp_num,
            $result[0]['employee_no']
        );

        $this->assertEquals(
            'approved',
            $result[0]['status']
        );
    }

    /** @test */
    public function it_ignores_non_approved_leave_status()
    {
        $user = $this->user();

        $date = $this->scenarioDate();

        $leave = (object)[
            'id' => 3,
            'employeeId' => $user->bhr_num,
            'start' => $date,
            'end' => $date,
            'dates' => (object)[
                $date => 1
            ],
            'type' => (object)[
                'name' => 'Vacation Leave'
            ],
            'status' => (object)[
                'status' => 'pending',
                'lastChangedByUserId' => 0
            ]
        ];

        $result = $this->repo->bind_leaves_to_dtr(
            [$leave],
            2
        );

        $this->assertIsArray($result);
        $this->assertEmpty($result);
    }
}
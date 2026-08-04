<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use App\Exports\ExportDTRLog;

/**
 * ExportDTRLog (0% covered, 64 lines) — pure Maatwebsite export mapper for the DTR Log download
 * (Menu=Payroll Page=DTR Logs Action=export). No DB, no filesystem: construct with crafted rows,
 * assert collection()/map()/headings() directly. Both POV arms, holiday present/absent, and
 * payroll-item present/absent arms are exercised.
 */
class ExportDTRLogTest extends TestCase
{
    private function row(array $overrides = [])
    {
        return array_merge([
            'emp_num' => '001', 'full_name' => 'Alice Export', 'department' => 'IT',
            'date' => '2026-07-10', 'timezone' => 'Asia/Manila',
            'holidays' => [['type' => 'lh', 'name' => 'Test Holiday']],
            'time_in' => '08:00', 'time_out' => '17:00',
            'start_datetime' => '2026-07-10 08:00', 'end_datetime' => '2026-07-10 17:00',
            'start_flexy_datetime' => null, 'end_flexy_datetime' => null,
            'break_time' => '01:00',
            'payroll_items' => ['rendered_hours' => 8, 'late' => 0.5],
            'user_POV' => [
                'time_in' => '13:00', 'time_out' => '22:00',
                'start_datetime' => '2026-07-10 13:00', 'end_datetime' => '2026-07-10 22:00',
                'start_flexy_datetime' => null, 'end_flexy_datetime' => null,
            ],
        ], $overrides);
    }

    /** @test */
    public function collection_and_headings_have_expected_shape()
    {
        $export = new ExportDTRLog([$this->row()], true, 'Asia/Manila');

        $this->assertCount(1, $export->collection());
        $headings = $export->headings();
        $this->assertCount(24, $headings);
        $this->assertSame('ID', $headings[0]);
        $this->assertSame('OT_ND', $headings[23]);
    }

    /** @test */
    public function map_with_pov_toggle_uses_own_times_and_fixed_timezone()
    {
        $export = new ExportDTRLog([], true, 'Europe/Brussels');

        $mapped = $export->map($this->row());

        $this->assertSame('001', $mapped[0]);
        $this->assertSame('lh', $mapped[4]);                 // holiday type arm
        $this->assertSame('Test Holiday', $mapped[5]);
        $this->assertSame('Europe/Brussels', $mapped[6]);    // toggle -> fixed timezone
        $this->assertSame('08:00', $mapped[7]);              // own time_in
        $this->assertSame(8, $mapped[14]);                   // rendered_hours present
        $this->assertNull($mapped[15]);                      // sl missing -> null arm
        $this->assertSame(0.5, $mapped[19]);                 // late present
    }

    /** @test */
    public function map_without_pov_toggle_uses_user_pov_times_and_row_timezone()
    {
        $export = new ExportDTRLog([], false, 'ignored');

        $mapped = $export->map($this->row([
            'holidays' => [],                                 // no-holiday arm
            'payroll_items' => [],                            // all payroll arms -> null
        ]));

        $this->assertNull($mapped[4]);
        $this->assertNull($mapped[5]);
        $this->assertSame('Asia/Manila', $mapped[6]);        // row timezone
        $this->assertSame('13:00', $mapped[7]);              // user_POV time_in
        $this->assertSame('2026-07-10 22:00', $mapped[10]);  // user_POV end
        $this->assertNull($mapped[14]);
        $this->assertNull($mapped[22]);
    }
}

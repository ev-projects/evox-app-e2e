<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

use Tests\TestCase;
use App\Providers\AppServiceProvider;
use App\Providers\BroadcastServiceProvider;
use App\Providers\PHPExcelMacroServiceProvider;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Files\TemporaryFileFactory;
use Maatwebsite\Excel\Sheet;
use Maatwebsite\Excel\Writer;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use ReflectionProperty;
use Throwable;

/**
 * Completes boot() — the last uncovered method — on the three application service providers:
 *
 *   App\Providers\AppServiceProvider          (was 55.81%)
 *   App\Providers\PHPExcelMacroServiceProvider (was 66.67%)
 *   App\Providers\BroadcastServiceProvider     (was 0%, provider is commented out of config/app.php)
 *
 * WHY A USER CARES
 *  - AppServiceProvider::boot registers the two custom validation rules that stop double-booking:
 *    `unique_dates` (a change-schedule request must not overlap another request for the same
 *    employee) and `unique_payroll_cutoff` (a new payroll cutoff must not overlap an existing one).
 *    If either rule silently stopped firing, payroll would run twice over the same days.
 *  - PHPExcelMacroServiceProvider::boot registers the 15 Writer/Sheet formatting macros that every
 *    EVOX Excel export (DTR, disputes, team schedule, attendance) calls while rendering.
 *  - BroadcastServiceProvider::boot publishes the /broadcasting/auth endpoint and the
 *    `App.User.{id}` private channel that gates per-user realtime notifications.
 *
 * ARMS COVERED (both success and failure paths, not just happy path):
 *  - unique_dates: overlap found -> `return false` arm; no overlap -> `return true` arm.
 *  - unique_payroll_cutoff: missing end_date -> early `return true` guard; overlap found ->
 *    `$query_count === 0` false arm; clear range -> true arm.
 *  - PHPExcel macros: all 13 working macro bodies invoked and their effect on the underlying
 *    PhpSpreadsheet worksheet asserted, plus the 2 broken macro bodies driven to the throw
 *    (characterization, see findings).
 *  - BroadcastServiceProvider::boot is called exactly ONCE in this suite (a single test method) so
 *    the duplicate /broadcasting/auth route it would add cannot leak into other tests.
 *
 * Read-only against the DB: the validator tests probe ONE existing row and reuse its dates.
 * No writes, so no DatabaseTransactions trait is needed. No stored procedures are involved.
 *
 * FINDING PXL-1 (characterized, not fixed): Writer macro `setCellValue` calls
 *   $writer->getDelegate()->setCellValue(...) but Writer::getDelegate() returns a
 *   PhpOffice\PhpSpreadsheet\Spreadsheet, which has no setCellValue() (that method lives on
 *   Worksheet). Any export that calls $writer->setCellValue(...) dies with a fatal \Error.
 *
 * FINDING PXL-2 (characterized, not fixed): Sheet macro `setNumFormatPeso` references
 *   PHPExcel_Style_NumberFormat::FORMAT_PERCENTAGE_00. PHPExcel 1.8 is not installed (the project
 *   is on PhpSpreadsheet) and the name is unimported, so PHP resolves it to
 *   App\Providers\PHPExcel_Style_NumberFormat -> class-not-found \Error. The macro is also
 *   misnamed: it would apply a PERCENTAGE format, not a peso format.
 *
 * FINDING APP-1 (observation): the `unique_dates` rule is no longer referenced by any FormRequest.
 *   ChangeScheduleRequest::rules() dropped it and only the orphan error message remains in
 *   messages(). Overlapping change-schedule requests are therefore no longer blocked at validation.
 */
class ProvidersBootTest extends TestCase
{
    // ================================================================= AppServiceProvider::boot

    /** @test */
    public function app_service_provider_boot_registers_both_custom_date_validators()
    {
        (new AppServiceProvider($this->app))->boot();

        $factory    = $this->app['validator'];
        $reflection = new ReflectionProperty(get_class($factory), 'extensions');
        $reflection->setAccessible(true);
        $extensions = $reflection->getValue($factory);

        $this->assertArrayHasKey('unique_dates', $extensions);
        $this->assertArrayHasKey('unique_payroll_cutoff', $extensions);
        $this->assertInstanceOf(\Closure::class, $extensions['unique_dates']);
        $this->assertInstanceOf(\Closure::class, $extensions['unique_payroll_cutoff']);
    }

    /** @test */
    public function unique_dates_rule_rejects_an_overlapping_change_schedule_and_accepts_a_free_range()
    {
        (new AppServiceProvider($this->app))->boot();

        $existing = DB::table('change_schedules')
            ->whereNotNull('user_id')
            ->whereNotNull('valid_from')
            ->whereNotNull('valid_to')
            ->orderBy('id', 'desc')
            ->first();

        if (!$existing) {
            $this->markTestSkipped('No change_schedules row available to build an overlap from.');
        }

        // Submitted window strictly contains the existing request -> overlap -> rule returns false.
        $wraparoundFrom = date('Y-m-d', strtotime($existing->valid_from . ' -1 day'));
        $wraparoundTo   = date('Y-m-d', strtotime($existing->valid_to . ' +1 day'));

        $overlapping = Validator::make(
            [
                'bind_id'    => $existing->user_id,
                'valid_from' => $wraparoundFrom,
                'valid_to'   => $wraparoundTo,
            ],
            ['valid_from' => 'unique_dates:change_schedules']
        );

        $this->assertTrue(
            $overlapping->fails(),
            'unique_dates must reject a window that swallows an existing change-schedule request.'
        );

        // Employee with no history at all -> zero matches -> rule returns true.
        $free = Validator::make(
            [
                'bind_id'    => -999999,
                'valid_from' => '2099-01-01',
                'valid_to'   => '2099-01-05',
            ],
            ['valid_from' => 'unique_dates:change_schedules']
        );

        $this->assertFalse(
            $free->fails(),
            'unique_dates must accept a window for an employee with no overlapping requests.'
        );
    }

    /** @test */
    public function unique_payroll_cutoff_rule_short_circuits_when_end_date_is_missing()
    {
        (new AppServiceProvider($this->app))->boot();

        // Null guard arm: end_date empty -> return true before any query runs.
        $validator = Validator::make(
            ['start_date' => '2099-01-01'],
            ['start_date' => 'unique_payroll_cutoff:payroll_cutoffs']
        );

        $this->assertFalse(
            $validator->fails(),
            'A missing end_date must be left to the "required" rule, not reported as an overlap.'
        );
    }

    /** @test */
    public function unique_payroll_cutoff_rule_rejects_an_overlapping_cutoff_and_accepts_a_clear_range()
    {
        (new AppServiceProvider($this->app))->boot();

        $existing = DB::table('payroll_cutoffs')
            ->whereNull('deleted_at')
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->orderBy('id', 'desc')
            ->first();

        if (!$existing) {
            $this->markTestSkipped('No payroll_cutoffs row available to build an overlap from.');
        }

        $clash = Validator::make(
            [
                'start_date' => $existing->start_date,
                'end_date'   => $existing->end_date,
            ],
            ['start_date' => 'unique_payroll_cutoff:payroll_cutoffs']
        );

        $this->assertTrue(
            $clash->fails(),
            'Re-submitting an existing cutoff range must be rejected as an overlap.'
        );

        $clear = Validator::make(
            ['start_date' => '2099-01-01', 'end_date' => '2099-01-15'],
            ['start_date' => 'unique_payroll_cutoff:payroll_cutoffs']
        );

        $this->assertFalse(
            $clear->fails(),
            'A far-future cutoff range that touches nothing must be accepted.'
        );
    }

    // ======================================================= PHPExcelMacroServiceProvider::boot

    /** @test */
    public function excel_macro_provider_boot_registers_every_writer_and_sheet_macro()
    {
        (new PHPExcelMacroServiceProvider($this->app))->boot();

        foreach (['setCreator', 'setCellValue'] as $macro) {
            $this->assertTrue(Writer::hasMacro($macro), "Writer macro {$macro} was not registered.");
        }

        $sheetMacros = [
            'setOrientation', 'styleCells', 'setNumFormatPeso', 'setNumFormatPercent',
            'horizontalAlign', 'verticalAlign', 'wrapText', 'mergeCells', 'columnWidth',
            'rowHeight', 'setFontFamily', 'setFontSize', 'textRotation',
        ];

        foreach ($sheetMacros as $macro) {
            $this->assertTrue(Sheet::hasMacro($macro), "Sheet macro {$macro} was not registered.");
        }
    }

    /** @test */
    public function excel_sheet_macros_apply_their_formatting_to_the_underlying_worksheet()
    {
        (new PHPExcelMacroServiceProvider($this->app))->boot();

        $spreadsheet = new Spreadsheet();
        $worksheet   = $spreadsheet->getActiveSheet();
        $sheet       = new Sheet($worksheet);

        $this->sheetMacro('setOrientation')($sheet, PageSetup::ORIENTATION_LANDSCAPE);
        $this->sheetMacro('styleCells')($sheet, 'A1', ['font' => ['bold' => true]]);
        $this->sheetMacro('setNumFormatPercent')($sheet, 'B1');
        $this->sheetMacro('horizontalAlign')($sheet, 'C1', Alignment::HORIZONTAL_CENTER);
        $this->sheetMacro('verticalAlign')($sheet, 'C2', Alignment::VERTICAL_TOP);
        $this->sheetMacro('wrapText')($sheet, 'C3');
        $this->sheetMacro('mergeCells')($sheet, 'D1:E1');
        $this->sheetMacro('columnWidth')($sheet, 'F', 20.5);
        $this->sheetMacro('rowHeight')($sheet, '3', 30.0);
        $this->sheetMacro('setFontFamily')($sheet, 'G1', 'Arial');
        $this->sheetMacro('setFontSize')($sheet, 'G2', 14.0);
        $this->sheetMacro('textRotation')($sheet, 'H1', 45);

        $this->assertSame(PageSetup::ORIENTATION_LANDSCAPE, $worksheet->getPageSetup()->getOrientation());
        $this->assertTrue($worksheet->getStyle('A1')->getFont()->getBold());
        $this->assertSame('#,##0.00"%"', $worksheet->getStyle('B1')->getNumberFormat()->getFormatCode());
        $this->assertSame(Alignment::HORIZONTAL_CENTER, $worksheet->getStyle('C1')->getAlignment()->getHorizontal());
        $this->assertSame(Alignment::VERTICAL_TOP, $worksheet->getStyle('C2')->getAlignment()->getVertical());
        $this->assertTrue($worksheet->getStyle('C3')->getAlignment()->getWrapText());
        $this->assertArrayHasKey('D1:E1', $worksheet->getMergeCells());
        $this->assertEquals(20.5, $worksheet->getColumnDimension('F')->getWidth());
        $this->assertEquals(30.0, $worksheet->getRowDimension(3)->getRowHeight());
        $this->assertSame('Arial', $worksheet->getStyle('G1')->getFont()->getName());
        $this->assertEquals(14.0, $worksheet->getStyle('G2')->getFont()->getSize());
        $this->assertSame(45, $worksheet->getStyle('H1')->getAlignment()->getTextRotation());

        $spreadsheet->disconnectWorksheets();
    }

    /** @test */
    public function excel_writer_set_creator_macro_stamps_the_document_author()
    {
        (new PHPExcelMacroServiceProvider($this->app))->boot();

        $writer      = $this->freshWriter($spreadsheet);
        $this->writerMacro('setCreator')($writer, 'EVOX Payroll');

        $this->assertSame('EVOX Payroll', $spreadsheet->getProperties()->getCreator());

        $spreadsheet->disconnectWorksheets();
    }

    /**
     * FINDING PXL-1 — characterization, current (broken) behaviour asserted.
     *
     * @test
     */
    public function excel_writer_set_cell_value_macro_fatals_on_the_spreadsheet_delegate_FINDING_PXL_1()
    {
        (new PHPExcelMacroServiceProvider($this->app))->boot();

        $writer = $this->freshWriter($spreadsheet);
        $thrown = null;

        try {
            $this->writerMacro('setCellValue')($writer, 'A1', 'Employee No');
        } catch (Throwable $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'setCellValue is expected to fatal today (FINDING PXL-1).');
        $this->assertStringContainsString('setCellValue', $thrown->getMessage());

        $spreadsheet->disconnectWorksheets();
    }

    /**
     * FINDING PXL-2 — characterization, current (broken) behaviour asserted.
     *
     * @test
     */
    public function excel_sheet_set_num_format_peso_macro_fatals_on_missing_phpexcel_class_FINDING_PXL_2()
    {
        (new PHPExcelMacroServiceProvider($this->app))->boot();

        $spreadsheet = new Spreadsheet();
        $sheet       = new Sheet($spreadsheet->getActiveSheet());
        $thrown      = null;

        try {
            $this->sheetMacro('setNumFormatPeso')($sheet, 'A1');
        } catch (Throwable $e) {
            $thrown = $e;
        }

        $this->assertNotNull($thrown, 'setNumFormatPeso is expected to fatal today (FINDING PXL-2).');
        $this->assertStringContainsString('PHPExcel_Style_NumberFormat', $thrown->getMessage());

        $spreadsheet->disconnectWorksheets();
    }

    // ========================================================== BroadcastServiceProvider::boot

    /**
     * Called exactly once in this suite. Broadcast::routes() appends /broadcasting/auth to the
     * router, so a second call inside the same application instance would register a duplicate.
     *
     * @test
     */
    public function broadcast_provider_boot_publishes_the_auth_route_and_the_private_user_channel()
    {
        $this->artisan('route:clear'); // ensure no cached route file blocks Broadcast::routes()
        if ($this->app->routesAreCached()) {
            $this->markTestSkipped('Route cache could not be cleared; Broadcast::routes() would short-circuit.');
        }

        // Pin the broadcaster so the assertion does not depend on the machine's BROADCAST_DRIVER.
        config(['broadcasting.default' => 'null']);

        (new BroadcastServiceProvider($this->app))->boot();

        $uris = [];
        foreach (Route::getRoutes()->getRoutes() as $route) {
            $uris[] = $route->uri();
        }

        $this->assertContains(
            'broadcasting/auth',
            $uris,
            'Broadcast::routes() must expose the channel-authorisation endpoint.'
        );

        $broadcaster = Broadcast::driver();
        $channelsRef = new ReflectionProperty(get_class($broadcaster), 'channels');
        $channelsRef->setAccessible(true);
        $channels = $channelsRef->getValue($broadcaster);

        $this->assertArrayHasKey(
            'App.User.{id}',
            $channels,
            'routes/channels.php must be required so the private per-user channel is authorised.'
        );

        // The channel callback is the real gate: own id passes, someone else's id is refused.
        $callback = $channels['App.User.{id}'];
        $me       = (object) ['id' => 7];

        $this->assertTrue($callback($me, '7'));
        $this->assertFalse($callback($me, '8'));
    }

    // ================================================================================= helpers

    /**
     * Pull a registered macro closure straight out of the Macroable store.
     *
     * Going through $sheet->mergeCells(...) would NOT reach the macro: Maatwebsite's
     * DelegatedMacroable::__call forwards to the delegate first whenever the delegate already has
     * a method of that name (Worksheet::mergeCells does), so the registered closure would never
     * run. Invoking the closure directly exercises the provider's own code deterministically.
     */
    private function macroClosure(string $class, string $name): \Closure
    {
        $macros = new ReflectionProperty($class, 'macros');
        $macros->setAccessible(true);
        $registered = $macros->getValue();

        $this->assertArrayHasKey($name, $registered, "{$class} macro {$name} is not registered.");

        return $registered[$name];
    }

    private function sheetMacro(string $name): \Closure
    {
        return $this->macroClosure(Sheet::class, $name);
    }

    private function writerMacro(string $name): \Closure
    {
        return $this->macroClosure(Writer::class, $name);
    }

    /**
     * Writer only receives its Spreadsheet inside open(), which would spin up temporary files and
     * events. The delegate is injected directly instead — nothing is written to disk.
     */
    private function freshWriter(&$spreadsheet): Writer
    {
        $writer      = new Writer($this->app->make(TemporaryFileFactory::class));
        $spreadsheet = new Spreadsheet();

        $delegate = new ReflectionProperty(Writer::class, 'spreadsheet');
        $delegate->setAccessible(true);
        $delegate->setValue($writer, $spreadsheet);

        return $writer;
    }
}

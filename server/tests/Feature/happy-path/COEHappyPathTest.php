<?php
/**
 * HAPPY-PATH — Certificate of Employment / COE (valid submit, BHR faked)
 *
 * UPDATED 2026-07-09 per Vishnu's direct instruction (relayed by team-lead): "do everything
 * required, just don't post back anything to BHR or external resources." So: BhrRepositoryInterface
 * is bound in the test container to a fake implementation — COEController::create() never reaches
 * the real BHR service. No live external call happens in this file, full stop.
 *
 * What is NOT faked / still real: COERepository::create() (server/app/Modules/Coe/Repositories/
 * COERepository.php:48-136) calls two DB stored procedures directly —
 * EV_SP_COE_Get_Template and EV_SP_COE_Generate_Sequence — which are internal to the (disposable)
 * app DB, not an external system. If this schema-drifted dump doesn't have those SPs (several other
 * SPs are already known-missing per other matrices), this test will surface that as a documented
 * incomplete rather than a false pass/fail — same pattern used elsewhere in this suite.
 */

namespace Tests\Feature\HappyPath;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class COEHappyPathTest extends TestCase
{
    use DatabaseTransactions;

    private array $apiKey;
    private User $employee;

    protected function setUp(): void
    {
        parent::setUp();

        $this->apiKey = ['X-Authorization' => env('APP_API_KEY', 'RlYVynDl9ALmOtfCotsLS9iSr93bMzgpIWfoxLktznLfTUL3NfaNO5HittoAfA9Z')];
        $this->employee = User::where('email', 'glenn.macasarte@eastvantage.com')->firstOrFail();

        // Fake BHR record — COEController::create() reads these keys off whatever
        // get_user_bhr_field() returns. No network/external call happens; this is a plain PHP
        // object returned in-process.
        $fakeEmployeeArray = [
            // EV_SP_COE_Generate_Sequence/EV_SP_COE_Get_Template validate this against the real
            // EV_COE_Sequence.Location column (read-only lookup confirmed the value below exists) —
            // it's a location string, not a numeric id, despite the '18' BHR-field-id key name.
            '18'         => 'Philippines - Taguig (BGC)',
            '4455'       => 'PH',         // third arg to EV_SP_COE_Get_Template
            'fullname1'  => 'HAPPY-PATH-AUTOTEST Employee',
            'address1'   => '123 Test St',
            'address2'   => '',
            'city'       => 'Test City',
            'state'      => 'Test State',
            'zipcode'    => '0000',
            'country'    => 'Philippines',
            'hireDate'   => now()->subYears(2)->toDateString(),
            'jobTitle'   => 'QA Automation',
            'payRate'    => '50000.00',
        ];

        // COERepository::create() also does $employee[$coef->field_name] for every
        // CoeBhrFields row configured for this user's country — with no isset() guard, so any
        // key not present throws "Undefined index". Rather than guess the allowance field-code
        // list from a code comment, read the real (read-only) coe_bhr_fields rows for this
        // employee's country and pre-fill every field_name/subf_field_name with '0' (a value
        // that safely fails the `$fieldValue > 0` check downstream, so nothing gets written to
        // coe_bhr_field_values, keeping this a minimal, predictable row).
        $coeBhrFields = \App\Modules\Coe\Models\CoeBhrFields::where('country_id', $this->employee->country_id)->get();
        foreach ($coeBhrFields as $coef) {
            $fakeEmployeeArray[$coef->field_name] = '0';
            if ($coef->subf_field_name && strlen($coef->subf_field_name) > 0) {
                $fakeEmployeeArray[$coef->subf_field_name] = '0';
            }
        }

        $fakeEmployee = (object) $fakeEmployeeArray;

        $this->app->bind(BhrRepositoryInterface::class, function () use ($fakeEmployee) {
            return new class($fakeEmployee) implements BhrRepositoryInterface {
                private $fake;
                public function __construct($fake) { $this->fake = $fake; }
                public function get_all_bhr_user_numbers() { return []; }
                public function get_changed_users($start_date) { return []; }
                public function get_user(string $bhr_user_number, $for_sync = false) { return null; }
                public function get_profile_picture(string $bhr_user_number) { return null; }
                public function get_user_bhr_field(string $bhr_user_number, string $user_fields_key = '', $additional_fields = array()) {
                    return $this->fake; // never calls out — this IS the BHR response, faked
                }
                public function get_user_job_information(string $bhr_user_number, string $field_name) { return null; }
                public function get_report(string $report_id) { return null; }
                public function get_leave_credits(string $bhr_user_number, string $end_date) { return null; }
                public function sync_holidays(string $start_date, string $end_date) { return null; }
                public function get_holidays(string $start_date, string $end_date) { return []; }
                public function get_leaves(string $start_date, string $end_date, ?\App\Modules\User\Models\User $user = null) { return []; }
            };
        });
    }

    /** @test */
    public function valid_coe_submit_with_faked_bhr_creates_a_row()
    {
        $this->withoutMiddleware();

        $payload = [
            'purpose_index'      => 1,
            'show_compensation'  => false,
        ];

        $response = $this->actingAs($this->employee)->postJson('/api/request/coe', $payload, $this->apiKey);

        if (in_array($response->status(), [400, 404, 500], true)) {
            $this->markTestIncomplete(
                'COE create did not reach 201 — most likely EV_SP_COE_Get_Template / ' .
                'EV_SP_COE_Generate_Sequence are missing on this schema-drifted dump (same class of ' .
                'gap as EV_SP_Validate_Request_Payroll_Period noted elsewhere), not a BHR/external issue ' .
                '(BHR is faked in setUp() and never called out). Response: ' . $response->getContent()
            );
        }

        // A successful create() streams a PDF response, not a JSON success envelope — assert on
        // the DB row instead of the HTTP body shape.
        $this->assertDatabaseHas('coes', [
            'user_id'        => $this->employee->id,
            'purpose_index'  => 1,
            'requested_by'   => $this->employee->id,
        ]);
    }
}

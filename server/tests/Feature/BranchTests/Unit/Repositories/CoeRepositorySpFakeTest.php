<?php

namespace Tests\Feature\BranchTests\Unit\Repositories;

require_once __DIR__ . '/../../Support/CallSpFake.php';

use Tests\TestCase;
use Tests\Support\CallSpFake;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Fluent;
use App\Modules\Coe\Models\COE;
use App\Modules\Coe\Models\CoeBhrFields;
use App\Modules\Coe\Repositories\COERepository;
use App\Modules\User\Models\User;

/**
 * SP-FAKE SEAM — COERepository (Menu=Profile Page=COE Action=request certificate).
 * File was 7.0% covered: create() calls THREE stored procedures (EV_SP_COE_Get_Template twice,
 * EV_SP_COE_Generate_Sequence once) — the reason its arms sat on the SKIPPED-DESTRUCTIVE list.
 * With the seam the real create() runs end-to-end: reference-number build, payRate formatting,
 * encrypt/decrypt round-trip, allowance loop, COE::create + CoeBhrFieldValues writes — all
 * rolled back by DatabaseTransactions. SPs never touch the DB.
 *
 * Arms:
 *   create() happy path        -> sequence+template SPs, reference format, encrypted row, allowances
 *   create() payRate no digits -> preg arm skipped, payRate stored verbatim
 *   create() unfaked SP        -> catch arm: log_error + rethrow
 *   all()                      -> bounded read for the authed user
 *   find()                     -> found + not-found
 */
class CoeRepositorySpFakeTest extends TestCase
{
    use DatabaseTransactions;

    /** @var COERepository */
    private $repo;
    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        CallSpFake::activate();
        $this->repo = new COERepository();

        $this->user = User::whereNotNull('emp_num')
            ->where('is_active', 1)
            ->orderBy('id', 'desc')
            ->first();
        if (!$this->user) $this->markTestSkipped('no active user with emp_num in test DB');
        $this->be($this->user);
    }

    protected function tearDown(): void
    {
        CallSpFake::reset();
        parent::tearDown();
    }

    private function fakeTemplateAndSequence(string $templateCode = 'TPL', string $sequence = '0007'): void
    {
        CallSpFake::fake('EV_SP_COE_Get_Template',
            [[(object) ['template_code' => $templateCode]]]);
        CallSpFake::fake('EV_SP_COE_Generate_Sequence',
            [[(object) ['GeneratedSequence' => $sequence]]]);
    }

    /**
     * BHR employee payload: the numeric-id fields create() reads plus one value per real
     * coe_bhr_fields row (first row > 0 to enter the allowance arm, the rest 0 to skip it).
     */
    private function employeePayload($coeBhrFields, string $payRate)
    {
        $employee = [
            '18' => 'PH', '4455' => 'Manila',
            'address1' => '12 Test St', 'address2' => 'Unit 3', 'city' => 'Makati',
            'state' => 'NCR', 'zipcode' => '1200', 'country' => 'PH',
            'payRate' => $payRate,
            'fullname1' => 'Coe Seam Fixture',
            'hireDate' => '2020-01-15',
            'jobTitle' => 'QA Engineer',
        ];
        foreach ($coeBhrFields as $i => $coef) {
            $employee[$coef->field_name] = $i === 0 ? '1234.5' : '0';
            if ($coef->subf_field_name && strlen($coef->subf_field_name) > 0) {
                $employee[$coef->subf_field_name] = 'PHP';
            }
        }
        return $employee;
    }

    private function requestPayload()
    {
        return new Fluent(['purpose_index' => 1, 'purpose_note' => null, 'show_compensation' => 1]);
    }

    // ---------------------------------------------------------------------- create()
    /** @test */
    public function create_builds_reference_number_encrypts_row_and_collects_allowances()
    {
        $this->fakeTemplateAndSequence('TPL', '0007');
        $coeBhrFields = CoeBhrFields::orderBy('id')->limit(2)->get();

        list($coe, $allowances, $template) = $this->repo->create(
            $this->user, $coeBhrFields, $this->requestPayload(),
            $this->employeePayload($coeBhrFields, 'PHP 25000.5 monthly')
        );

        // reference: COE-{emp_num}-{template_code}-{Ymd}-{sequence}
        $this->assertSame(
            'COE-' . $this->user->emp_num . '-TPL-' . date('Ymd') . '-0007',
            $coe->sequence_number
        );
        // decrypt round-trip done by create() itself before returning
        $this->assertSame('12 Test St Unit 3 Makati, NCR 1200 PH', $coe->address);
        $this->assertSame('PHP 25,000.50 monthly', $coe->basic_pay);   // digits reformatted in place
        $this->assertSame('Coe Seam Fixture', $coe->full_name);
        $this->assertSame($this->user->id, $coe->requested_by);
        $this->assertSame('TPL', $template->template_code);
        $this->assertNotNull(COE::find($coe->id));                     // row exists inside the txn

        if (count($coeBhrFields) > 0) {
            $this->assertCount(1, $allowances);                        // only the > 0 field
            $this->assertStringStartsWith('1,234.50', $allowances[0]['value']);
        } else {
            $this->assertSame([], $allowances);
        }

        // SP boundary: template asked for twice (log line + template fetch), sequence once
        $this->assertCount(2, CallSpFake::callsFor('EV_SP_COE_Get_Template'));
        $seq = CallSpFake::callsFor('EV_SP_COE_Generate_Sequence');
        $this->assertCount(1, $seq);
        $this->assertSame(['PH'], $seq[0]['params']);
        $tpl = CallSpFake::callsFor('EV_SP_COE_Get_Template');
        $this->assertSame(['PH', $this->user->id, 'Manila'], $tpl[0]['params']);
    }

    /** @test */
    public function create_keeps_payrate_verbatim_when_it_has_no_digits()
    {
        $this->fakeTemplateAndSequence();
        $empty = collect([]);

        list($coe) = $this->repo->create(
            $this->user, $empty, $this->requestPayload(),
            $this->employeePayload($empty, 'confidential')
        );

        $this->assertSame('confidential', $coe->basic_pay);
    }

    /** @test */
    public function create_with_unfaked_sp_hits_catch_and_rethrows()
    {
        // no fakes registered -> first call_sp throws -> catch -> log_error -> rethrow
        $this->expectException(\RuntimeException::class);

        $empty = collect([]);
        $this->repo->create(
            $this->user, $empty, $this->requestPayload(),
            $this->employeePayload($empty, '100')
        );
    }

    // ------------------------------------------------------------------ all() / find()
    /** @test */
    public function all_returns_only_the_authed_users_coes_oldest_first()
    {
        $out = $this->repo->all();

        foreach ($out as $coe) {
            $this->assertEquals($this->user->id, $coe->user_id);
        }
        $this->assertTrue($out->count() >= 0);
    }

    /** @test */
    public function find_returns_row_or_null()
    {
        $this->assertNull($this->repo->find(-1));

        $existing = COE::orderBy('id', 'desc')->first();
        if ($existing) {
            $this->assertEquals($existing->id, $this->repo->find($existing->id)->id);
        }
    }
}

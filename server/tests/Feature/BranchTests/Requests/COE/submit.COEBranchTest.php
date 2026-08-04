<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for COEController::create arms. Menu=Requests Page=COE.
 *
 * SKIPPED arms (forbidden by SPEC):
 *   // SKIPPED-EXTERNAL bhr->get_user_bhr_field is a real BHR/external call -> ALWAYS IoC-mocked here.
 *   // NOTE: the foreach inner `if ($coef->subf_field_name && strlen>0)` only mutates the $additional_fields
 *      array passed to the mocked bhr call; both outcomes flow to the same return, so no distinct branch
 *      outcome is testable -> not separately authored.
 * The $employee-truthy success arm IS authored (previously skipped as destructive) because every unsafe
 * surface has a seam: the COE write goes through the IoC-MOCKED COERepositoryInterface::create (never runs),
 * Storage is Storage::fake('public') (no real disk), PDF::loadView->stream() is facade-mocked (no dompdf
 * render), and log_to_audit_trail() is a single scoped Eloquent INSERT into audit_trail rolled back by
 * DatabaseTransactions. log_to_file('coelog') only writes a log line (channel exists in config/logging.php).
 *
 * FINDING: create() calls log_to_file('warning', "Image does not exits.", [path], 'coelog') UNCONDITIONALLY
 *   (COEController.php line 80) BEFORE the Storage exists() check, so a false "Image does not exits." warning
 *   is logged on every COE creation even when the header image exists; the else arm then logs it a second time.
 * FINDING: if the fixture country has no utc_timelogs row, User::country_timezone_name() calls ->timezone on
 *   null (ErrorException -> caught -> 400); success tests guard-skip on that data precondition.
 *
 * Covered branches:
 *   - employee_id provided (User::find)  + bhr returns falsy -> if(!$employee) -> error_response 404
 *   - employee_id empty (auth()->user()) + bhr returns falsy -> if(!$employee) -> error_response 404
 *   - $employee truthy + Storage exists TRUE  (header image inlined)  -> PDF stream 200
 *   - $employee truthy + Storage exists FALSE (warning logged)        -> PDF stream 200
 *   - catch(Exception) -> error_response default 400
 *
 * Route: POST /api/request/coe -> create(COERequest) [COERequest requires purpose_index]
 */

namespace Tests\Feature\BranchTests\Requests\COE;

use Exception;
use Tests\TestCase;
use Mockery;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use App\Modules\Coe\Models\COE;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;

class COESubmitBranchTest extends TestCase
{
    use DatabaseTransactions;

    /** @var User */
    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
        Queue::fake();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestIncomplete('no user in test DB');
        $this->actingAs($this->user);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockDep(string $iface): \Mockery\MockInterface
    {
        $m = Mockery::mock($iface);
        $this->app->instance($iface, $m);
        return $m;
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'purpose_index' => 0,
            'session_id'    => 1,
        ], $overrides);
    }

    // ---------------------------------------------------------------- create()
    // if(!empty(employee_id)) TRUE -> User::find; bhr falsy -> if(!$employee) -> error_response 404
    /** @test */
    public function create__submit__employee_id_provided__not_found_404()
    {
        $this->mockDep(COERepositoryInterface::class);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andReturn(null);

        $res = $this->postJson('/api/request/coe', $this->payload(['employee_id' => $this->user->id]));

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // if(!empty(employee_id)) FALSE -> auth()->user(); bhr falsy -> if(!$employee) -> error_response 404
    /** @test */
    public function create__submit__auth_user__not_found_404()
    {
        $this->mockDep(COERepositoryInterface::class);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andReturn(null);

        $res = $this->postJson('/api/request/coe', $this->payload());

        $res->assertStatus(404)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // catch arm: bhr->get_user_bhr_field throws -> error_response default 400
    /** @test */
    public function create__submit__exception__error_400()
    {
        $this->mockDep(COERepositoryInterface::class);
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andThrow(new Exception('boom'));

        $res = $this->postJson('/api/request/coe', $this->payload());

        $res->assertStatus(400)->assertJsonStructure(['error' => ['message', 'content']]);
    }

    // ------------------------------------------------- create() success arm seams
    /**
     * country_timezone_name() does ->first()->timezone on utc_timelogs; no row for the
     * fixture user's country would ErrorException inside the success arm -> guard-skip.
     */
    private function skipUnlessTimezoneRow()
    {
        if (!UtcTimelog::where('country_id', $this->user->country_id)->first()) {
            $this->markTestIncomplete('no utc_timelogs row for fixture user country_id');
        }
    }

    /**
     * Seam for the IoC-mocked COERepositoryInterface::create() return:
     * [0] unsaved COE model (never persisted), [1] allowances, [2] template object.
     */
    private function createdCoeSeam(): array
    {
        $coe = new COE();
        $coe->sequence_number = 'COE-BRANCHTEST-0001';
        $coe->created_at = Carbon::now();

        $allowances = [];
        $coe_template = (object) ['template_header' => 'coe-branch-test-header.png'];

        return [$coe, $allowances, $coe_template];
    }

    /**
     * Facade-mocks PDF::loadView(...)->setPaper('a4','portrait')->stream(...) so no
     * dompdf render / blade view compile ever runs.
     */
    private function mockPdfFacade()
    {
        $pdf = Mockery::mock();
        $pdf->shouldReceive('setPaper')->once()->with('a4', 'portrait')->andReturnSelf();
        $pdf->shouldReceive('stream')->once()->andReturn(response('%PDF-BRANCHTEST', 200));
        \PDF::shouldReceive('loadView')->once()->andReturn($pdf);
    }

    private function mockSuccessArmRepos()
    {
        $coeRepo = $this->mockDep(COERepositoryInterface::class);
        $coeRepo->shouldReceive('create')->once()->andReturn($this->createdCoeSeam());
        $bhr = $this->mockDep(BhrRepositoryInterface::class);
        $bhr->shouldReceive('get_user_bhr_field')->once()->andReturn(['work_email' => 'branch@test']);
    }

    // $employee truthy; Storage exists() TRUE arm -> header image base64-inlined -> pdf stream 200.
    // audit_trail INSERT (log_to_audit_trail) is rolled back by DatabaseTransactions.
    /** @test */
    public function create__submit__employee_found_image_exists__pdf_200()
    {
        $this->skipUnlessTimezoneRow();
        Storage::fake('public');
        Storage::disk('public')->put('images/coe-branch-test-header.png', 'fake-png-bytes');

        $this->mockSuccessArmRepos();
        $this->mockPdfFacade();

        $res = $this->postJson('/api/request/coe', $this->payload());

        $res->assertStatus(200);
        $this->assertEquals('%PDF-BRANCHTEST', $res->getContent());
    }

    // $employee truthy; Storage exists() FALSE arm -> "Image does not exits." warning logged,
    // $header_image stays '' -> pdf stream 200.
    /** @test */
    public function create__submit__employee_found_image_missing__pdf_200()
    {
        $this->skipUnlessTimezoneRow();
        Storage::fake('public'); // empty fake disk -> exists() FALSE

        $this->mockSuccessArmRepos();
        $this->mockPdfFacade();

        $res = $this->postJson('/api/request/coe', $this->payload());

        $res->assertStatus(200);
        $this->assertEquals('%PDF-BRANCHTEST', $res->getContent());
    }
}

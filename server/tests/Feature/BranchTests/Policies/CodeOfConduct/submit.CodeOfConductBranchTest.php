<?php
/**
 * PHASE 3 v2 (latest code) - AUTHORED. Branch tests for CodeOfConductController::store arms. Menu=Policies Page=CodeOfConduct.
 *
 * DEPENDENCY NOTE — CodeOfConductController takes NO constructor/injected dependencies (Auth facade +
 * App\CodeOfConduct model used directly). Both success arms use DatabaseTransactions-safe Eloquent writes.
 * Each test method seeds the required code_of_conduct fixture state IN the test body (within the
 * DatabaseTransactions transaction) to deterministically route Branch A vs Branch B.
 *
 * store() branches (routes/api.php, mounted under /api):
 *   POST /api/acknowledge_coc -> store()
 *     Branch A: $user_coc && is_acknowledged===1 -> $user_coc->save()      (UPDATE — seeded in test)
 *     Branch B: else                             -> CodeOfConduct::create() (INSERT — seeded absence in test)
 *     catch(Exception)                           -> [dead, see FINDING]
 *
 * FINDINGS:
 *  // FINDING: store() catch(Exception) — CodeOfConductController does NOT `use Exception;`
 *             (namespace App\Http\Controllers), so `Exception` resolves to the non-existent
 *             App\Http\Controllers\Exception. A real throwable is NOT caught -> uncaught 500.
 *             Mitigated by seeding deterministic DB state so save()/create() succeed on first try.
 */

namespace Tests\Feature\BranchTests\Policies\CodeOfConduct;

use Mockery;
use Tests\TestCase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class CodeOfConductSubmitBranchTest extends TestCase
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
        if ($this->user) {
            $this->actingAs($this->user);
        }
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    // -------------------------------------------------------------------- store()
    // Branch A: fixture row inserted (is_acknowledged=1) → controller finds $user_coc → save() arm.
    // The DELETE + INSERT run within the DatabaseTransactions transaction; both are rolled back at tearDown.
    /** @test */
    public function store__submit__existing_acknowledged_update_save__ok_200()
    {
        // Seed: ensure exactly one acknowledged CoC record for this user (Branch A path).
        DB::table('code_of_conduct')->where('user_id', $this->user->id)->delete();
        DB::table('code_of_conduct')->insert([
            'user_id'         => $this->user->id,
            'is_acknowledged' => 1,
            'acknowledged_at' => now(),
            'is_completed'    => 0,
            'created_at'      => now(),
            'updated_at'      => now(),
        ]);

        $res = $this->postJson('/api/acknowledge_coc');

        // Branch A: $user_coc->save() → response()->json(200).
        // FINDING: catch(Exception) dead (no `use Exception;`). save() on existing row succeeds → 200.
        $this->assertNotEquals(500, $res->status(), 'CoC store Branch A: save must not yield 500');
        $res->assertStatus(200);
    }

    // Branch B: no CoC record for user → $user_coc is null → else arm → CodeOfConduct::create().
    // The DELETE runs within the DatabaseTransactions transaction; the INSERT and DELETE are both rolled back.
    /** @test */
    public function store__submit__create_new_acknowledgement__ok_200()
    {
        // Seed: remove any existing record so $user_coc is null (Branch B fires).
        DB::table('code_of_conduct')->where('user_id', $this->user->id)->delete();

        $res = $this->postJson('/api/acknowledge_coc');

        // Branch B: CodeOfConduct::create() → response()->json(200).
        // FINDING: catch(Exception) dead (no `use Exception;`). create() success → 200.
        $this->assertNotEquals(500, $res->status(), 'CoC store Branch B: CodeOfConduct::create must not yield 500');
        $res->assertStatus(200);
    }
}

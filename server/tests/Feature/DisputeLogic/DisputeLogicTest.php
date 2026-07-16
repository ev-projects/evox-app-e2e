<?php
// Payroll Dispute logic tests — assert the REAL current behavior (documents A11, A31).
// Uses withoutMiddleware to reach the controller; DatabaseTransactions so the disputes row
// rolls back. See PAYROLL-DISPUTE-LOGIC-EXPLAINED.md.

namespace Tests\Feature\DisputeLogic;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use App\Modules\User\Models\User;

class DisputeLogicTest extends TestCase
{
    use DatabaseTransactions;

    private $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware();
        $this->user = User::where('is_active', 1)->first() ?? User::first();
        if (!$this->user) $this->markTestSkipped('no user in test DB');
    }

    /** @test A11 — validation failure returns HTTP 200 (not 422), with an 'errors' key */
    public function store_returns_200_not_422_on_validation_failure()
    {
        // employee_id is required|exists — omit it so the inline Validator fails.
        $resp = $this->actingAs($this->user)->postJson('/api/storedispute', [
            'dispute_type' => 'x',
        ]);
        $resp->assertStatus(200);          // BUG A11: should be 422
        $resp->assertJsonStructure(['errors']);
    }

    /** @test A31 — mass assignment: caller can set status + pay amounts + created_by directly */
    public function store_mass_assigns_status_and_pay_amounts()
    {
        $resp = $this->actingAs($this->user)->postJson('/api/storedispute', [
            'employee_id'  => $this->user->id,
            'dispute_type' => 'OT correction',
            'description'  => 'DISPUTE-LOGIC-AUTOTEST',
            'status'       => 'approved',   // should NOT be caller-settable
            'created_by'   => 999999,       // spoofed
            'Overtime'     => '99.00',      // arbitrary money field
            'Bonus'        => '12345',      // arbitrary money field
            'Payout_Inclusion' => 1,
        ]);
        $resp->assertStatus(201);
        // Prove the untrusted fields were persisted verbatim (the vulnerability).
        $id = $resp->json('dispute.id');
        $this->assertNotNull($id, 'dispute created');
        $row = DB::table('disputes')->where('id', $id)->first();
        $this->assertEquals('approved', $row->status, 'BUG A31: caller-set status persisted');
        $this->assertEquals(99.0, (float)$row->Overtime, 'BUG A31: caller-set Overtime persisted');
        $this->assertEquals(999999, (int)$row->created_by, 'BUG A31: spoofed created_by persisted');
    }
}

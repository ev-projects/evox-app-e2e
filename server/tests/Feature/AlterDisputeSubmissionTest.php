<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Modules\User\Models\User;

class AlterDisputeSubmissionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_user_can_create_alter_log_dispute_request()
    {
        $this->withoutMiddleware();

        $user = User::find(1593);

        if (!$user) {
            $this->markTestSkipped('Employee test user not found.');
        }

        $response = $this->actingAs($user)->postJson('/api/request/alter_log', [
            'user_id'       => $user->id,
            'date'          => '2026-04-20',
            'new_time_in'   => '2026-04-20 08:00:00',
            'new_time_out'  => '2026-04-20 17:00:00',
            'type'          => 'alter_log',
            'employee_note' => 'Dispute Request',
            'approver_note' => '',
            'status'        => 'pending',
            'request_mode'  => 'dispute',
            'updated_by'    => $user->id,
            'created_by'    => $user->id,
        ]);


        $response->assertStatus(201);
        $response->assertJsonStructure([
            'content',
            'message'
        ]);
        
        $response->assertJson([
            'message' => trans('messages.dispute_request_success'),
        ]);

        $this->assertDatabaseHas('EV_Dispute_AlterLog', [
            'user_id' => $user->id,
            'date'    => '2026-04-20',
            'status'  => 'approved',
        ]);
    }
    
    public function test_supervisor_can_approve_alter_log_dispute_request()
    {
        $this->withoutMiddleware();
    
        $user = User::find(1593);
    
        if (!$user) {
            $this->markTestSkipped('Employee test user not found.');
        }

        $approver = User::find(1698);
    
        if (!$approver) {
            $this->markTestSkipped('Approver test user not found.');
        }
    
        /**
         * First create dispute request
         */
        $createResponse = $this->actingAs($user)->postJson('/api/request/alter_log', [
            'user_id'       => $user->id,
            'date'          => '2026-04-20',
            'new_time_in'   => '2026-04-20 08:00:00',
            'new_time_out'  => '2026-04-20 17:00:00',
            'type'          => 'alter_log',
            'employee_note' => 'Dispute Request',
            'approver_note' => '',
            'status'        => 'pending',
            'request_mode'  => 'dispute',
            'updated_by'    => $user->id,
            'created_by'    => $user->id,
        ]);
    
        $createResponse->assertStatus(201);
    
        /**
         * Get created dispute record
         */
        $dispute_summary = \DB::table('EV_Dispute_Dtr_Summary')
            ->where('user_id', $user->id)
            ->where('login_date', '2026-04-20')
            ->latest('id')
            ->first();
    
        $this->assertNotNull($dispute_summary);
    
        /**
         * Approve dispute request
         * Adjust endpoint if needed
         */
        $approveResponse = $this->actingAs($approver)->putJson('/api/updatedispute/'.$dispute_summary->id, [
            'remarks'  => 'Dispute Approval',
            'status'   => 1,
        ]);
    
        $approveResponse->assertStatus(200);
    
        $approveResponse->assertJsonStructure([
            'content',
            'message'
        ]);
        
        $approveResponse->assertJson([
            'message' => trans('messages.dispute_status_success'),
        ]);
    
        /**
         * Final DB assertion
         */
        $this->assertDatabaseHas('EV_Dispute_Dtr_Summary', [
            'id'      => $dispute_summary->id,
            'Remarks' => 'Dispute Approval',
            'state'   => 1,
        ]);
    }
}
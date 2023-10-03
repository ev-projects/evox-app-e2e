<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class AddMeetingroomApproval extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        $meetingroom_approval_role = Role::where('name', 'supervisor')->first();
       
        $meetingroom_approval_permission = [
            Permission::create(['name' => 'meeting_room_approval', 'label' => 'Meeting Room Approval']),
        ];
        $meetingroom_approval_role->syncPermissions($meetingroom_approval_permission);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}

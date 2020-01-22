<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePermissionsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->string('permission_code')->unique()->primary();
            $table->string('role');
            $table->string('module');
            $table->string('type');
            $table->string('permission');
            $table->timestamps();

            $table->foreign('role')->references('role')->on('roles')->onDelete('cascade');
        });
        /**
         *  Heirarchy:
         *      Role
         *          Module
         *              Type
         *                  Permission code => Permission
         */

        $permission = array(
            
            'Employee' => array(
                'User' => array(
                    'View' => array(
                        1001 => 'My Profile',
                    )
                ),
                'Daily Time Record' => array(
                    'View' => array(
                        1201 => 'Daily Time Record',
                        1202 => 'Quickpunch',
                    )
                ),
                'Request' => array(
                    'View' => array(
                        1301 => 'Request',
                        1304 => 'My Inbox List',
                    ),
                    'Add' => array(
                        1302 => 'Request',
                    ),
                    'Edit' => array(
                        1303 => 'Request',
                    )
                    ),
                'Other submodules' => array(
                    'View' => array(
                        1501 => 'Associates',
                        1502 => 'Inspirations',
                        1503 => 'EV Buddy',
                        1504 => 'EV E-Learnings',
                        1505 => 'Contact Us',
                        1506 => 'Associates'
                    )
                )
            ),
                    
            'Supervisor' => array(
                'User' => array(
                    'View' => array(
                        1002 => 'My Team List',
                    )
                ),
                'Daily Time Record' => array(
                    'View' => array(
                        1203 => 'My Team\'s Daily Time Record List',
                    )
                ),
                'Scheduling' => array(
                    'View' => array(
                        1101 => 'My Team\'s Schedule',
                        1103 => 'Template Schedule List',
                        1104 => 'Template Schedule',
                    ),
                    'Edit' => array(
                        1102 => 'My Team\'s Schedule',
                        1106 => 'Template Schedule',
                        1108 => 'Assign Schedule per Department'
                    ),
                    'Add' => array(
                        1105 => 'Template Schedule',
                    ),
                    'Delete' => array(
                        1107 => 'Template Schedule',
                    ),
                ),
                'Reports' => array(
                    'View' => array(
                        1401 => 'DTR Logs',
                        1402 => 'DTR Summary',
                    )
                ),
                'Request' => array(
                    'View' => array(
                        1305 => 'My Team Request List',
                        1306 => 'My Team Request Approval',
                    ),
                    'Edit' => array(
                        1307 => 'My Team Request Approval',
                    ),
                )
            )
        );

        $insert = array();
        foreach($permission as $role => $modules){
            foreach( $modules as $module => $types ){
                foreach( $types as $type => $permissions ){
                    foreach( $permissions as $permission_code => $permission ){
                        $insert[] = array(
                            'permission_code' =>    $permission_code,
                            'role' =>               $role,
                            'module' =>             $module,
                            'type' =>               $type,
                            'permission' =>         $permission,
                            'created_at' =>         date('Y-m-d H:i:s'),
                            'updated_at' =>         date('Y-m-d H:i:s')
                        );
                    }
                }
            }
        }
        
        DB::table('permissions')->insert($insert);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('permissions');
    }
}

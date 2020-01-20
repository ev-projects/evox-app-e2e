<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('users', function (Blueprint $table) {
            $table->string('emp_num')->unique()->primary();
            $table->unsignedBigInteger('bhr_num')->unique();
            $table->unsignedBigInteger('department_id')->foreign('department_id')->references('id')->on('department');
            $table->string('email');
            $table->string('username');
            $table->string('password');
            $table->string('first_name');
            $table->string('middle_name');
            $table->string('last_name');
            $table->string('employment_status');
            $table->boolean('is_active')->default(false);
            $table->boolean('force_change_password')->default(false);
            $table->rememberToken();
            $table->timestamps();
        });

        

        Schema::create('users_supervisors', function (Blueprint $table) {
            $table->string('emp_num');
            $table->string('supervisor_emp_num');

            $table->unique(['emp_num', 'supervisor_emp_num']);

            $table->foreign('emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            $table->foreign('supervisor_emp_num')->references('emp_num')->on('users')->onDelete('cascade');
            
        });

        $insert = array(
            array('emp_num' => '2065',
                  'bhr_num' => '2065',
                  'department_id' => 1,
                  'email' => "aaron.colina@eastvantage.com",
                  'username' => "acolina2065",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Aaron Andrew',
                  'middle_name' => 'Magsino',
                  'last_name' => 'Colina',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '012',
                  'bhr_num' => '012',
                  'department_id' => 1,
                  'email' => "carmela.garcia@eastvantage.com",
                  'username' => "cgarcia012",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Carmela',
                  'middle_name' => 'G',
                  'last_name' => 'Garcia',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            ),
            array('emp_num' => '1479',
                  'bhr_num' => '1479',
                  'department_id' => 1,
                  'email' => "mel.uggadan@eastvantage.com",
                  'username' => "muggadan1479",
                  'password' => Hash::make("ABC123"),
                  'first_name' => 'Meljohn',
                  'middle_name' => 'O',
                  'last_name' => 'Uggadan',
                  'employment_status' => "Full-Time",
                  'is_active' => true,
                  'created_at' =>         date('Y-m-d H:i:s'),
                  'updated_at' =>         date('Y-m-d H:i:s')
            )
        );
        DB::table('users')->insert($insert);

        $insert = array(
            array(
                'emp_num' => '2065',
                'supervisor_emp_num' => '012'
            ),
            array(
                'emp_num' => '1479',
                'supervisor_emp_num' => '012'
            ),
        );
        DB::table('users_supervisors')->insert($insert);

    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('users_supervisors');
        Schema::dropIfExists('users');
    }
}

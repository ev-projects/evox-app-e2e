<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAlterlogPunchesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('alter_log_punches', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->date('date')->nullable();
            $table->json('old_punch');
            $table->json('new_punch');
           

            $table->text('employee_note')->nullable();
            $table->text('approver_note')->nullable();

            $table->string('status')->default('pending')->index();

            $table->unsignedInteger('updated_by')->nullable()->index();
            $table->unsignedInteger('created_by')->nullable()->index();


            $table->timestamps();



            $table->index(['user_id', 'date']);

        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('itrequirements');
    }
}

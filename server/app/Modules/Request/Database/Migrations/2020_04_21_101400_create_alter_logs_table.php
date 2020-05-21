<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAlterLogsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('alter_logs', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->date('date')->index();
            $table->bigInteger('current_time_in')->nullable();
            $table->bigInteger('current_time_out')->nullable();
            $table->bigInteger('new_time_in')->nullable();
            $table->bigInteger('new_time_out')->nullable();
            $table->text('employee_note')->nullable();
            $table->text('approver_note')->nullable();
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('updated_by')->nullable()->index();
            $table->unsignedInteger('created_by')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'date']);
            $table->index(['user_id', 'date', 'current_time_in']);
            $table->index(['user_id', 'date', 'current_time_out']);
            $table->index(['user_id', 'date', 'new_time_in']);
            $table->index(['user_id', 'date', 'new_time_out']);
            $table->index(['user_id', 'date', 'new_time_in', 'new_time_out']);
            $table->index(['user_id', 'date', 'current_time_in', 'current_time_out']);
            $table->index(['user_id', 'date', 'current_time_in', 'current_time_out', 'new_time_in', 'new_time_out'], 'alter_logs_all_keys');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('alter_logs');
    }
}

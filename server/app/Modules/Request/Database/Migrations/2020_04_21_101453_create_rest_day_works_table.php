<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateRestDayWorksTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('rest_day_works', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->nullable()->index();            
            $table->date('date')->nullable();
            $table->integer('start_time')->nullable();
            $table->integer('end_time')->nullable();
            $table->integer('break_time')->nullable();
            $table->text('employee_note')->nullable();
            $table->text('approver_note')->nullable();
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('updated_by')->nullable()->index();
            $table->unsignedInteger('created_by')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'start_time']);
            $table->index(['user_id', 'end_time']);
            $table->index(['user_id', 'break_time']);
            $table->index(['user_id', 'start_time', 'end_time']);
            $table->index(['user_id', 'start_time', 'end_time', 'break_time']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('rest_day_works');
    }
}

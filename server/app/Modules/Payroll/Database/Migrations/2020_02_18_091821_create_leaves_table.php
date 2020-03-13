<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateLeavesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('leaves', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('dtr_id')->nullable()->index();
            $table->string('type')->index();
            $table->enum('status', array('requested', 'approved', 'denied', 'canceled'))->index();
            $table->text('employee_note')->nullable();
            $table->text('manager_note')->nullable();
            $table->softDeletes();
            $table->timestamps();
            
            $table->index(['dtr_id', 'type', 'status']);
            $table->index(['dtr_id', 'type']);
            $table->index(['dtr_id', 'status']);
            $table->index(['type', 'status']);

            $table->unique(['dtr_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('leaves');
    }
}

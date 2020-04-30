<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateOvertimesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('overtimes', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->date('date')->index();
            $table->integer('amount')->index();
            $table->string('type')->index();
            $table->text('employee_note')->nullable();
            $table->text('approver_note')->nullable();
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('updated_by')->nullable()->index();
            $table->unsignedInteger('created_by')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'date', 'type']);
            $table->index(['user_id', 'date', 'amount']);
            $table->index(['user_id', 'date', 'type', 'amount']);
        });
    }
    

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('overtimes');
    }
}

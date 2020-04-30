<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateWorkFromHomesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('work_from_homes', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->nullable()->index();            
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();
            $table->text('employee_note')->nullable();
            $table->text('approver_note')->nullable();
            $table->string('status')->default('pending')->index();
            $table->unsignedInteger('updated_by')->nullable()->index();
            $table->unsignedInteger('created_by')->nullable()->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['user_id', 'valid_from']);
            $table->index(['user_id', 'valid_to']);
            $table->index(['user_id', 'valid_from', 'valid_to']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('work_from_homes');
    }
}

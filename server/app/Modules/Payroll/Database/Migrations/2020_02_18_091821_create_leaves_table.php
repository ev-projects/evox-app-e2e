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
            $table->string('name')->index();
            $table->enum('status', array('approved', 'pending', 'denied', 'cancelled'))->index();
            $table->softDeletes();
            $table->timestamps();
            
            $table->index(['dtr_id', 'name', 'status']);
            $table->index(['dtr_id', 'name']);
            $table->index(['dtr_id', 'status']);
            $table->index(['name', 'status']);

            $table->unique(['dtr_id', 'name', 'status']);
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

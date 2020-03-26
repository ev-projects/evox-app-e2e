<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrPayrollItemsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('dtr_payroll_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('dtr_id')->nullable()->index();
            $table->enum('type', array('lh', 'sh', 'dlh', 'dsh', 'slh', 'rd'))->nullable()->default(null)->index();
            $table->string('item')->index();
            $table->string('value');
            
            $table->index(['dtr_id', 'type']);
            $table->index(['dtr_id', 'type', 'item']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtr_payroll_items');
    }
}

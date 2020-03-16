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
            $table->enum('computation_type', array('regular', 'legal', 'special', 'rest_day'))->index();
            $table->string('items')->index();
            $table->string('value');
            
            $table->index(['dtr_id', 'computation_type']);
            $table->index(['dtr_id', 'computation_type', 'items']);
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

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
            $table->string('item')->index();
            $table->string('value');
            $table->string('tag')->nullable()->default(null)->index();
            
            $table->index(['dtr_id', 'item']);
            $table->index(['dtr_id', 'tag']);
            $table->index(['dtr_id', 'item', 'tag']);

            $table->unique(['dtr_id', 'item', 'tag']);
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

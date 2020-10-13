<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreatePayrollCutoffsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('payroll_cutoffs', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name')->index();
            $table->date('start_date')->index();
            $table->date('end_date')->index();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['start_date', 'end_date']);

            // $table->unique(['start_date', 'end_date']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('payroll_cutoffs');
    }
}

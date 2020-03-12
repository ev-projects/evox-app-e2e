<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrHolidaysTableForeignKey extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('dtr_holidays', function (Blueprint $table) {
            $table->foreign('dtr_id')->references('id')->on('dtrs')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign('holiday_id')->references('id')->on('holidays')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtr_holidays');
    }
}

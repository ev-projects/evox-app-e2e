<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CoeAddColumnToCoeBhrFields extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('coe_bhr_fields', function (Blueprint $table) {
            $table->boolean('is_money')->after('field_label');
            $table->boolean('encrypt')->after('is_money');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('coe_bhr_fields', function (Blueprint $table) {
            //
        });
    }
}

<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CoeBhrFieldValuesMigration extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //coe_bhr_field_values
        Schema::create('coe_bhr_field_values', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('coe_id');
            $table->integer('coe_bhr_field_id');
            $table->text('value');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}

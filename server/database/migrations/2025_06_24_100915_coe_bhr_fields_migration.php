<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CoeBhrFieldsMigration extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('coe_bhr_fields', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('country_id');
            $table->string('field_name', 15);
            $table->string('subf_field_name', 15)->nullable()->default('');
            $table->string('field_label', 30);
            $table->integer('status_id');
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

<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CoeTemplatesMigration extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('coe_templates', function (Blueprint $table) {
            $table->increments('id');
            $table->string('bind_to', 15);
            $table->integer('bind_id');
            $table->string('template_name', 30);
            $table->string('template_header', 150);
            $table->string('location_name', 30);
            $table->string('employer_name', 150);
            $table->string('employer_address', 150);
            $table->string('signatory_name', 50);
            $table->string('signatory_position', 100);
            $table->string('signature_file', 50);
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

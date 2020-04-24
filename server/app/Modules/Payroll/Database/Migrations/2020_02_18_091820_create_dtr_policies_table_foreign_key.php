<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrPoliciesTableForeignKey extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('dtr_policies', function (Blueprint $table) {
            // FK for Dtr Policies
            $table->foreign('dtr_id')->references('id')->on('dtrs')->onUpdate('cascade')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtr_policies');
    }
}

<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrPoliciesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('dtr_policies', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('dtr_id')->nullable()->index();
            $table->string('policy')->index();
            $table->string('value')->nullable();

            $table->index(['dtr_id', 'policy']);
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

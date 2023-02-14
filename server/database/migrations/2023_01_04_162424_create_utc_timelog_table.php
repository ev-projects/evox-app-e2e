<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUtcTimelogTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('utc_timelog', function (Blueprint $table) {
            $table->increments('id');
            $table->string('country_time_zone', 45);
            $table->string('time_difference', 45);
            $table->integer('country_id');
            $table->string('country_name')->nullable();
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
        Schema::dropIfExists('utc_timelog');
    }
}

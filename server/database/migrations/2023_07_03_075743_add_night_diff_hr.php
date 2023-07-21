<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddNightDiffHr extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        Schema::table('dtr_collective_punch', function (Blueprint $table) {
            $table->bigInteger('night_diff_over_lapp')->nullable()->after('render_hours');
            $table->bigInteger('night_diff')->nullable()->after('render_hours');

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

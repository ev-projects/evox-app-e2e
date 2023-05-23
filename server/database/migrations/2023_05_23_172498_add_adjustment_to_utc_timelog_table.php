<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddAdjustmentToUtcTimelogTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('utc_timelog', function (Blueprint $table) {
            $table->string('time_difference_adjusted')->nullable()->after('time_difference');
            $table->date('start_adjustment')->nullable()->after('time_difference_adjusted');
            $table->date('end_adjustment')->nullable()->after('start_adjustement');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        // Schema::table('users', function (Blueprint $table) {
        //     //
        // });
    }
}

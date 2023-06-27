<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddUseLogsStateToDtrTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('dtrs', function (Blueprint $table) {
            
            $table->boolean('use_logs')->default(false)->after('is_rest_day');
            $table->boolean('use_schedule')->default(true)->after('is_rest_day');

        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
      
    }
}

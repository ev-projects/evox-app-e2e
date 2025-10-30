<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddRequestedByToCoesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('coes', function (Blueprint $table) {
            $table->integer('requested_by')->nullable()->after('show_compensation');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('coes', function (Blueprint $table) {
            $table->dropColumn('requested_by');
        });
    }
}

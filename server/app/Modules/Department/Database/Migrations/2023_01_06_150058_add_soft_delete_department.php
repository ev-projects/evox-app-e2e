<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddSoftDeleteDepartment extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('departments', function (Blueprint $table) {
         
            $table->date('disabled_on')->nullable()->after('description');
            $table->unsignedInteger('disabled_by')->nullable()->after('description');
            // $table->boolean('is_disabled')->default(false)->after('description');
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_disabled');
            $table->dropColumn('disabled_on');
            // $table->dropColumn('disabled_by');
        });
    }
}
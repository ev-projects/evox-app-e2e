<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CoeAddTemplateCodeToCoeTemplates extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('coe_templates', function (Blueprint $table) {
            $table->string('template_code', 10)->after('bind_id');
            $table->text('employer_name')->change();
            $table->string('employer_entity', 100)->after('employer_name');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('coe_templates', function (Blueprint $table) {
            //
        });
    }
}

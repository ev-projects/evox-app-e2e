<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class DtrDecimalTypeChange extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        //
        Schema::table('drt_summary_report', function (Blueprint $table) {
            $table->decimal('reg_late', 11, 9)->change();
            $table->decimal('reg_undertime', 11, 9)->change();
            $table->decimal('reg_rendered_hours', 11, 9)->change();
            $table->decimal('reg_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('reg_night_diff', 11, 9)->change();
            $table->decimal('reg_night_diff_overlapp', 11, 9)->change();
            $table->decimal('reg_overtime', 11, 9)->change();
            $table->decimal('reg_overtime_night_diff', 11, 9)->change();
            $table->decimal('rd_rendered_hours', 11, 9)->change();
            $table->decimal('rd_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('rd_night_diff', 11, 9)->change();
            $table->decimal('rd_night_diff_overlapp', 11, 9)->change();
            $table->decimal('rd_overtime', 11, 9)->change();
            $table->decimal('rd_overtime_night_diff', 11, 9)->change();
            $table->decimal('lh_rendered_hours', 11, 9)->change();
            $table->decimal('lh_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('lh_night_diff', 11, 9)->change();
            $table->decimal('lh_night_diff_overlapp', 11, 9)->change();
            $table->decimal('lh_overtime', 11, 9)->change();
            $table->decimal('lh_overtime_night_diff', 11, 9)->change();
            $table->decimal('sh_rendered_hours', 11, 9)->change();
            $table->decimal('sh_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('sh_night_diff', 11, 9)->change();
            $table->decimal('sh_night_diff_overlapp', 11, 9)->change();
            $table->decimal('sh_overtime', 11, 9)->change();
            $table->decimal('sh_overtime_night_diff', 11, 9)->change();
            $table->decimal('dsh_rendered_hours', 11, 9)->change();
            $table->decimal('dsh_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('dsh_night_diff', 11, 9)->change();
            $table->decimal('dsh_night_diff_overlapp', 11, 9)->change();
            $table->decimal('dsh_overtime', 11, 9)->change();
            $table->decimal('dsh_overtime_night_diff', 11, 9)->change();
            $table->decimal('dlh_rendered_hours', 11, 9)->change();
            $table->decimal('dlh_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('dlh_night_diff', 11, 9)->change();
            $table->decimal('dlh_night_diff_overlapp', 11, 9)->change();
            $table->decimal('dlh_overtime', 11, 9)->change();
            $table->decimal('dlh_overtime_night_diff', 11, 9)->change();
            $table->decimal('slh_rendered_hours', 11, 9)->change();
            $table->decimal('slh_rendered_hours_overlapp', 11, 9)->change();
            $table->decimal('slh_night_diff', 11, 9)->change();
            $table->decimal('slh_night_diff_overlapp', 11, 9)->change();
            $table->decimal('slh_overtime', 11, 9)->change();
            $table->decimal('slh_overtime_night_diff', 11, 9)->change();
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

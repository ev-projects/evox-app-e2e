<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDtrSummaryReportTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('drt_summary_report', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->integer('supervisor_id')->default(0);
            $table->date('login_date');
            $table->decimal('unpaid_leave', 11, 2)->nullable()->default(0.00);
            $table->decimal('on_leave', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_late', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_undertime', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('reg_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('rd_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('rd_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('rd_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('rd_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('rd_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('rd_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('lh_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('lh_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('lh_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('lh_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('lh_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('lh_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('sh_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('sh_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('sh_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('sh_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('sh_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('sh_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('dsh_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('dsh_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('dsh_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('dsh_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('dsh_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('dsh_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('dlh_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('dlh_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('dlh_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('dlh_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('dlh_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('dlh_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('slh_rendered_hours', 11, 2)->nullable()->default(0.00);
            $table->decimal('slh_rendered_hours_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('slh_night_diff', 11, 2)->nullable()->default(0.00);
            $table->decimal('slh_night_diff_overlapp', 11, 2)->nullable()->default(0.00);
            $table->decimal('slh_overtime', 11, 2)->nullable()->default(0.00);
            $table->decimal('slh_overtime_night_diff', 11, 2)->nullable()->default(0.00);
            $table->string('nigdiff_stauts', 45)->default('1');
            $table->string('render_status', 45)->default('1');
            $table->string('status', 45)->default('0');
            $table->timestamps();
            $table->unique(['user_id', 'supervisor_id', 'login_date'], 'user_id');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('dtr_summary_report');
    }
}

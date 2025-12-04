<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateHappinessSurveyTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('happiness_survey', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('user_id');
            $table->year('year');
            $table->tinyInteger('focused_motivated')->nullable();
            $table->tinyInteger('growing_professionally')->nullable();
            $table->tinyInteger('work_understanding')->nullable();
            $table->tinyInteger('superior_relationship')->nullable();
            $table->tinyInteger('superior_feedback')->nullable();
            $table->tinyInteger('superior_approachability')->nullable();
            $table->tinyInteger('management_rewards')->nullable();
            $table->tinyInteger('colleagues_relationship')->nullable();
            $table->tinyInteger('ev_greatness')->nullable();
            $table->tinyInteger('will_recommend_ev')->nullable();
            $table->tinyInteger('policies_welfare')->nullable();
            $table->tinyInteger('safe_to_express')->nullable();
            $table->tinyInteger('it_system_satisfaction')->nullable();
            $table->tinyInteger('hr_response_satisfaction')->nullable();
            $table->tinyInteger('payroll_response_satisfaction')->nullable();
            $table->tinyInteger('ev_development_attention')->nullable();
            $table->tinyInteger('opportunities_satisfaction')->nullable();
            $table->tinyInteger('trainings_satisfaction')->nullable();
            $table->tinyInteger('healthcare_satisfaction')->nullable();
            $table->tinyInteger('work_flexibility')->nullable();
            $table->tinyInteger('salary_level')->nullable();
            $table->tinyInteger('compensation_performance')->nullable();
            $table->tinyInteger('salary_on_time')->nullable();
            $table->tinyInteger('salary_computation')->nullable();
            $table->tinyInteger('new_normal_setup')->nullable();
            $table->string('happiness_suggestion')->nullable();
            $table->timestamps();
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
        Schema::dropIfExists('happiness_survey');
    }
}

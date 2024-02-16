<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateRoleLevelFeaturesTable extends Migration
{
    public function up()
    {

        Schema::create('role_level_features', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('evox_levels_id')->index();
            $table->unsignedInteger('features_id')->index();

            $table->unique(['evox_levels_id', 'features_id']);

            $table->index(['evox_levels_id', 'features_id']);

            $table->foreign('evox_levels_id')->references('LevelId')->on('EVOX_LEVELS')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign('features_id')->references('id')->on('features')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('role_level_features');
    }
}

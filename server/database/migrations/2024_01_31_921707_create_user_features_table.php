<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateUserFeaturesTable extends Migration
{
    public function up()
    {

      
        Schema::create('user_features', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('user_id')->index();
            $table->unsignedInteger('feature_id')->index();
            $table->boolean("has_access")->default(false);

            $table->unique(['user_id', 'feature_id']);

            $table->index(['user_id', 'feature_id']);

            $table->foreign('user_id')->references('id')->on('users')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign('feature_id')->references('id')->on('features')->onUpdate('cascade')->onDelete('cascade');
            $table->timestamps();
        });
       
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('team_users');
    }
}

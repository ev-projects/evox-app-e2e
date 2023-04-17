<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAnnouncementsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('announcements', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title');
            $table->string('headline')->nullable();
            $table->string('thumbnail')->nullable();
            $table->text('content')->nullable();
            $table->string('category')->nullable();
            $table->date('log_date')->nullable();
            $table->date('release_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->boolean('on_link')->default(0)->nullable(); //optional
            $table->string('link')->nullable(); //optional
            $table->boolean('status')->default(1)->nullable();
            $table->tinyInteger('exposure_level')->default(1)->nullable();
            $table->string('language')->nullable();  //optional


            $table->unsignedInteger('dep_id')->nullable();
            $table->foreign('dep_id')->references('id')->on('departments')->onUpdate('cascade')->onDelete('set null');


            $table->unsignedInteger('country_id')->default(2)->nullable();
            // $table->foreign('announcements.country_id')->references('utc_timelog.country_id')->on('utc_timelog')->onUpdate('cascade')->onDelete('set null');


            $table->unsignedInteger('created_by')->nullable();
            $table->unsignedInteger('updated_by')->nullable();
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
        Schema::dropIfExists('announcements');
    }
}

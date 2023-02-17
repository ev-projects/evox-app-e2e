<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDepartmentAnnouncementsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('department_announcements', function (Blueprint $table) {
            $table->increments('id');
            $table->string('title');
            $table->string('headline')->nullable();
            $table->string('thumbnail')->nullable();
            $table->text('content')->nullable();
            $table->string('category')->nullable();
            $table->date('log_date')->nullable();
            $table->date('release_date')->nullable();
            $table->string('link')->nullable();
            $table->boolean('status')->default(1)->nullable();
            $table->tinyInteger('exposure_level')->default(1)->nullable();
            $table->unsignedInteger('dep_id')->nullable();
            $table->foreign('dep_id')->references('id')->on('departments')->onUpdate('cascade')->onDelete('set null');
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
        Schema::dropIfExists('department_announcements');
    }
}

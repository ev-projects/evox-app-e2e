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

        Schema::create('departments_announcements', function (Blueprint $table) {
            $table->unsignedInteger('department_id')->index();
            $table->unsignedInteger('announcement_id')->index();

            $table->unique(['department_id', 'announcement_id']);

            $table->index(['department_id', 'announcement_id']);

            $table->foreign('department_id')->references('id')->on('departments')->onUpdate('cascade')->onDelete('cascade');
            $table->foreign('announcement_id')->references('id')->on('announcements')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('departments_announcements');
    }
}

<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateAnnouncementsDepartmentsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {

        Schema::create('announcements_departments', function (Blueprint $table) {
            $table->unsignedInteger('announcement_id')->index();
            $table->json('department_ids')->nullable();
            $table->json('department_exculded_ids')->nullable();


            $table->unique(['announcement_id']);
            


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
        Schema::dropIfExists('announcements_departments');
    }
}

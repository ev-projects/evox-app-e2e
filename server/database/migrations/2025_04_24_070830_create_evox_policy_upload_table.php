<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateEvoxPolicyUploadTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('EV_Policies_Documents', function (Blueprint $table) {
            $table->increments('Id'); // Auto-incrementing primary key (Id)
            $table->longText('FileData')->nullable(); // File data, can be NULL
            $table->string('Title', 100)->nullable(); // Title, can be NULL
            $table->integer('IsGlobal')->nullable(); // Type field, can be NULL
            $table->integer('CountryId')->nullable();
            $table->tinyInteger('isDepartmentSelected')->nullable();
            $table->integer('DepartmentId')->nullable();
            $table->string('FileName', 150)->nullable();
            $table->string('FileExtension', 150)->nullable();
            $table->string('FileType', 150)->nullable();
            $table->tinyInteger('IsActive')->nullable();
            $table->integer('CreatedBy')->nullable(); // Country ID field, can be NULL
            $table->timestamp('UpdateOn');
            $table->timestamp('CreatedOn');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('EV_Policies_Documents');
    }
}

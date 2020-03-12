<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateHolidaysTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('holidays', function (Blueprint $table) {
            $table->increments('id');
            $table->string('name')->index();
            $table->date('date')->index();
            $table->enum('type', array('sh', 'lh'))->index();
            $table->boolean('is_predefined')->default(false);
            $table->softDeletes();
            $table->timestamps();

            
            $table->index(['name', 'date']);
            $table->index(['date', 'type']);
            $table->index(['name', 'date', 'type']);
            $table->index(['name', 'date', 'type', 'is_predefined']);

            
            $table->unique(['name', 'date', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('holidays');
    }
}

<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateCoesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('coes', function (Blueprint $table) {
            $table->increments('id');
            $table->bigInteger('user_id')->default(0);
            $table->integer('purpose_index')->default(0);
            $table->string('full_name')->nullable()->default('');
            $table->string('address')->nullable()->default('');
            $table->date('hire_date')->nullable();
            $table->date('separation_date')->nullable();
            $table->string('position')->nullable()->default('');
            $table->string('basic_pay')->default('0');
            $table->decimal('de_minimis', 8, 2)->default(0);
            $table->string('de_minimis_currency_code')->nullable()->default('');
            $table->decimal('other_allowance', 8, 2)->default(0);
            $table->string('other_allowance_currency_code')->nullable()->default('');
            $table->boolean("show_compensation")->default(false);
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
        Schema::dropIfExists('coes');
    }
}

<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateDisputesTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('disputes', function (Blueprint $table) {
            $table->increments('id'); // Primary key
            $table->unsignedInteger('employee_id'); // Define foreign key field as unsigned big integer
            $table->string('dispute_type', 50);
            $table->text('description');
            $table->string('created_by', 50);
            $table->string('status', 20)->default('Open');
            $table->timestamps(); // created_at and updated_at

            // Additional fields
            $table->integer('LWOP')->nullable();
            $table->integer('UT')->nullable();
            $table->integer('TARDINESS')->nullable();
            $table->integer('Late')->nullable();
            $table->integer('Night_Shift_Diff')->nullable();
            $table->integer('Overtime')->nullable();
            $table->integer('OT_with_NSD')->nullable();
            $table->integer('Rest_Day')->nullable();
            $table->integer('Rest_Day_200')->nullable(); // FOR S30 ONLY
            $table->integer('Rest_Day_Work_with_NSD')->nullable();
            $table->integer('Rest_Day_Work_with_OT')->nullable();
            $table->integer('Rest_Day_Work_NSD_with_OT')->nullable();
            $table->integer('Legal_Holiday')->nullable();
            $table->integer('Legal_Holiday_with_NSD')->nullable();
            $table->integer('Legal_Holiday_with_Overtime')->nullable();
            $table->integer('Legal_Holiday_OT_with_OT')->nullable();
            $table->integer('Special_Holiday')->nullable();
            $table->integer('Special_Holiday_200')->nullable(); // FOR S30 ONLY
            $table->integer('Special_Holiday_with_NSD')->nullable();
            $table->integer('Special_Holiday_with_Overtime')->nullable();
            $table->integer('Special_Holiday_OT_with_OT')->nullable();
            $table->decimal('Referral_Fee', 10, 2)->nullable();
            $table->decimal('Bonus', 10, 2)->nullable();
            $table->decimal('LWOP_Adjustment', 10, 2)->nullable();
            $table->decimal('Commission', 10, 2)->nullable();
            $table->string('Payroll_Period', 50)->nullable();
            $table->string('Payroll_Cutoff', 50)->nullable();
            $table->text('BPs_Remarks')->nullable();
            $table->dateTime('BPs_Date_Encoded')->nullable();
            $table->text('Payroll_Remarks')->nullable();
            $table->string('Payout_Inclusion', 50)->nullable();

            // Foreign key constraint
            $table->foreign('employee_id')->references('id')->on('users')->onDelete('cascade'); // Assuming users table
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('disputes');
    }
}

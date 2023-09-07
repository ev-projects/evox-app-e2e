<?php

use App\Modules\Coe\Models\COE;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class ChangeCoeColumnsDataType extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('coes', function (Blueprint $table) {
            $table->text('address')->default('0')->change();
            $table->text('basic_pay')->default('0')->change();
            $table->text('de_minimis')->default('0')->change();
            $table->text('other_allowance')->default('0')->change();
        });

        $coes = COE::all();
        foreach($coes as $coe) {
            $coe->address = encrypt($coe->address);
            $coe->basic_pay = encrypt($coe->basic_pay."");
            $coe->de_minimis = encrypt($coe->de_minimis."");
            $coe->other_allowance = encrypt($coe->other_allowance."");
            $coe->save();
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        //
    }
}

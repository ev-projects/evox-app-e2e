<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;

class CreatePermissionTables extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {   
        $tableNames = config('laravel-permission.table_names');
        $foreignKeys = config('laravel-permission.foreign_keys');
        $foreignTablePrimaryKey = config('laravel-permission.foreign_table_primary_key');
        
        Schema::create($tableNames['roles'], function (Blueprint $table) {
            $table->increments('id');
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create($tableNames['permissions'], function (Blueprint $table) {
            $table->increments('id');
            $table->string('name')->unique();
            $table->timestamps();
        });

        Schema::create($tableNames['user_has_permissions'], function (Blueprint $table) use ($tableNames, $foreignKeys, $foreignTablePrimaryKey) {
            $table->unsignedInteger($foreignKeys['users']);
            $table->unsignedInteger('permission_id');

            $table->foreign($foreignKeys['users'])
                ->references($foreignTablePrimaryKey['users'])
                ->on($tableNames['users'])
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->foreign('permission_id')
                ->references('id')
                ->on($tableNames['permissions'])
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->primary([$foreignKeys['users'], 'permission_id']);
        });

        Schema::create($tableNames['user_has_roles'], function (Blueprint $table) use ($tableNames, $foreignKeys, $foreignTablePrimaryKey) {
            $table->unsignedInteger('role_id');
            $table->unsignedInteger($foreignKeys['users']);

            $table->foreign('role_id')
                ->references('id')
                ->on($tableNames['roles'])
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->foreign($foreignKeys['users'])
                ->references($foreignTablePrimaryKey['users'])
                ->on($tableNames['users'])
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->primary(['role_id', $foreignKeys['users']]);
        });

        Schema::create($tableNames['role_has_permissions'], function (Blueprint $table) use ($tableNames) {
            $table->unsignedInteger('permission_id');
            $table->unsignedInteger('role_id');

            $table->foreign('permission_id')
                ->references('id')
                ->on($tableNames['permissions'])
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->foreign('role_id')
                ->references('id')
                ->on($tableNames['roles'])
                ->onUpdate('cascade')
                ->onDelete('cascade');

            $table->primary(['permission_id', 'role_id']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        $tableNames = config('laravel-permission.table_names');

        Schema::drop($tableNames['role_has_permissions']);
        Schema::drop($tableNames['user_has_roles']);
        Schema::drop($tableNames['user_has_permissions']);
        Schema::drop($tableNames['roles']);
        Schema::drop($tableNames['permissions']);
    }
}

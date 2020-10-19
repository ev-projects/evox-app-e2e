<?php

namespace App\Modules\Department\Providers;

use App\Modules\Department\Repositories\DepartmentRepository;
use App\Modules\Department\Repositories\DepartmentRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class DepartmentServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( DepartmentRepositoryInterface::class, DepartmentRepository::class );
    }

    /**
     * Register the application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }
}

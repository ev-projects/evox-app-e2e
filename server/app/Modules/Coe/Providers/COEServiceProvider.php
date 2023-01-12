<?php

namespace App\Modules\Coe\Providers;

use App\Modules\Coe\Repositories\COERepository;
use App\Modules\Coe\Repositories\COERepositoryInterface;
use Illuminate\Support\ServiceProvider;

class COEServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( COERepositoryInterface::class, COERepository::class );
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

<?php

namespace App\Modules\Bhr\Providers;

use App\Modules\Bhr\Repositories\BhrRepository;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class BhrServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( BhrRepositoryInterface::class, BhrRepository::class );
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

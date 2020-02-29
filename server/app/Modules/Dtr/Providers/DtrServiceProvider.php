<?php

namespace App\Modules\Dtr\Providers;

use App\Modules\Dtr\Repositories\DtrRepository;
use App\Modules\Dtr\Repositories\DtrRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class DtrServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( DtrRepositoryInterface::class, DtrRepository::class );
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

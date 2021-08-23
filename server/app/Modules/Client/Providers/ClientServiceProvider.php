<?php

namespace App\Modules\Client\Providers;

use App\Modules\Client\Repositories\ClientRepository;
use App\Modules\Client\Repositories\ClientRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class ClientServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( ClientRepositoryInterface::class, ClientRepository::class );
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

<?php

namespace App\Modules\Team\Providers;

use App\Modules\Team\Repositories\TeamRepository;
use App\Modules\Team\Repositories\TeamRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class TeamServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( TeamRepositoryInterface::class, TeamRepository::class );
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

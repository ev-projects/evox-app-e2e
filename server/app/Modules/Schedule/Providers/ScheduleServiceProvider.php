<?php

namespace App\Modules\Schedule\Providers;

use App\Modules\Schedule\Repositories\ScheduleRepository;
use App\Modules\Schedule\Repositories\ScheduleRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class ScheduleServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( ScheduleRepositoryInterface::class, ScheduleRepository::class );
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

<?php

namespace App\Modules\Department\Providers;

use App\Modules\Department\Repositories\AnnouncementRepository;
use App\Modules\Department\Repositories\AnnouncementRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class AnnouncementServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( AnnouncementRepositoryInterface::class, AnnouncementRepository::class );
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

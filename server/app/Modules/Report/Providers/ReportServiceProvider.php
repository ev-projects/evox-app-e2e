<?php

namespace App\Modules\Report\Providers;

use App\Modules\Report\Repositories\ReportRepository;
use App\Modules\Report\Repositories\ReportRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class ReportServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( ReportRepositoryInterface::class, ReportRepository::class );
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

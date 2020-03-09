<?php

namespace App\Modules\Payroll\Providers;

use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\PayrollRepository;
use App\Modules\Payroll\Repositories\PayrollRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class PayrollServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( DtrRepositoryInterface::class, DtrRepository::class );
        $this->app->bind( PayrollRepositoryInterface::class, PayrollRepository::class );
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

<?php

namespace App\Modules\Payroll\Providers;

use App\Modules\Payroll\Repositories\BiometricsRepository;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Repositories\DrupalEvoxRepository;
use App\Modules\Payroll\Repositories\DrupalEvoxRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrReportRepository;
use App\Modules\Payroll\Repositories\DtrReportRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepository;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Repositories\HolidayRepository;
use App\Modules\Payroll\Repositories\HolidayRepositoryInterface;
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
        $this->app->bind( BiometricsRepositoryInterface::class, BiometricsRepository::class );
        $this->app->bind( PayrollCutoffRepositoryInterface::class, PayrollCutoffRepository::class );
        $this->app->bind( DrupalEvoxRepositoryInterface::class, DrupalEvoxRepository::class );
        $this->app->bind( DtrReportRepositoryInterface::class, DtrReportRepository::class );
        $this->app->bind( HolidayRepositoryInterface::class, HolidayRepository::class );
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

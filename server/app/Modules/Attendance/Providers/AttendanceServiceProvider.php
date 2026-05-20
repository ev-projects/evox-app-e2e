<?php

namespace App\Modules\Attendance\Providers;

use App\Modules\Attendance\Repositories\AttendanceRepository;
use App\Modules\Attendance\Repositories\AttendanceRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class AttendanceServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( AttendanceRepositoryInterface::class, AttendanceRepository::class );
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

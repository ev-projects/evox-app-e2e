<?php

namespace App\Modules\User\Providers;

use Illuminate\Support\ServiceProvider;
use App\Modules\User\Repositories\UserRepository;
use App\Modules\User\Repositories\ProfileRepository;
use App\Modules\User\Repositories\UtcTimeLogRepository;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Repositories\ProfileRepositoryInterface;
use App\Modules\User\Repositories\UtcTimeLogRepositoryInterface;

class UserServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( UserRepositoryInterface::class, UserRepository::class );
        $this->app->bind( ProfileRepositoryInterface::class, ProfileRepository::class );
        $this->app->bind( UtcTimeLogRepositoryInterface::class, UtcTimeLogRepository::class );
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

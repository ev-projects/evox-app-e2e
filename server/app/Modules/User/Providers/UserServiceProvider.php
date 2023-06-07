<?php

namespace App\Modules\User\Providers;

use App\Modules\User\Repositories\UserRepository;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Repositories\ProfileRepository;
use App\Modules\User\Repositories\ProfileRepositoryInterface;
use Illuminate\Support\ServiceProvider;

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

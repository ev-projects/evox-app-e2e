<?php

namespace App\Modules\Email\Providers;

use App\Modules\Email\Repositories\EmailRepository;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use Illuminate\Support\ServiceProvider;

class EmailServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap the application services.
     *
     * @return void
     */
    public function boot()
    {
        $this->app->bind( EmailRepositoryInterface::class, EmailRepository::class );
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

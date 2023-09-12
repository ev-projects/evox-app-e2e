<?php

namespace App\Modules\Request\Providers;

use App\Modules\Request\Repositories\OvertimeRepository;
use App\Modules\Request\Repositories\OvertimeRepositoryInterface;

use App\Modules\Request\Repositories\ChangeScheduleRepository;
use App\Modules\Request\Repositories\ChangeScheduleRepositoryInterface;

use App\Modules\Request\Repositories\AlterLogRepository;
use App\Modules\Request\Repositories\AlterLogRepositoryInterface;

use App\Modules\Request\Repositories\RestDayWorkRepository;
use App\Modules\Request\Repositories\RestDayWorkRepositoryInterface;

use App\Modules\Request\Repositories\RequestRepository;
use App\Modules\Request\Repositories\RequestRepositoryInterface;

use App\Modules\Request\Repositories\AlterLogPunchRepository;
use App\Modules\Request\Repositories\AlterLogPunchRepositoryInterface;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * This namespace is applied to your controller routes.
     *
     * In addition, it is set as the URL generator's root namespace.
     *
     * @var string
     */
    protected $namespace = 'App\Modules\Request\Http\Controllers';

    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        //
        $this->app->bind( OvertimeRepositoryInterface::class, OvertimeRepository::class );
        $this->app->bind( AlterLogRepositoryInterface::class, AlterLogRepository::class );
        $this->app->bind( ChangeScheduleRepositoryInterface::class, ChangeScheduleRepository::class );
        $this->app->bind( RestDayWorkRepositoryInterface::class, RestDayWorkRepository::class );
        $this->app->bind( RequestRepositoryInterface::class, RequestRepository::class );
        $this->app->bind( AlterLogPunchRepositoryInterface::class, AlterLogPunchRepository::class );
        // $this->app->bind( OvertimeRepositoryInterface::class, OvertimeRepository::class );
        // $this->app->bind( OvertimeRepositoryInterface::class, OvertimeRepository::class );
        // $this->app->bind( OvertimeRepositoryInterface::class, OvertimeRepository::class );

        parent::boot();
    }

    /**
     * Define the routes for the module.
     *
     * @return void
     */
    public function map()
    {
        $this->mapWebRoutes();

        $this->mapApiRoutes();

        //
    }

    /**
     * Define the "web" routes for the module.
     *
     * These routes all receive session state, CSRF protection, etc.
     *
     * @return void
     */
    protected function mapWebRoutes()
    {
        Route::group([
            'middleware' => 'web',
            'namespace'  => $this->namespace,
        ], function ($router) {
            require module_path('request', 'Routes/web.php');
        });
    }

    /**
     * Define the "api" routes for the module.
     *
     * These routes are typically stateless.
     *
     * @return void
     */
    protected function mapApiRoutes()
    {
        Route::group([
            'middleware' => 'api',
            'namespace'  => $this->namespace,
            'prefix'     => 'api',
        ], function ($router) {
            require module_path('request', 'Routes/api.php');
        });
    }
}

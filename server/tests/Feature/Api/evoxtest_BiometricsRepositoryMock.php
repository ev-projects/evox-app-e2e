<?php

namespace Tests\Feature\Api;

use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

/**
 * Stand-in for BiometricsRepository when pdo_sqlsrv / pdo_dblib is absent.
 *
 * Returns two synthetic rows — one check-in ('I') and one check-out ('O') — which
 * is the minimum surface needed to exercise both the unfiltered read path and the
 * user-collection filter path without a live SQL Server connection.
 *
 * Bind it in setUp() whenever the driver is absent:
 *
 *   if (!extension_loaded('pdo_sqlsrv') && !extension_loaded('pdo_dblib')) {
 *       $this->app->bind(BiometricsRepositoryInterface::class,
 *                        fn() => new evoxtest_BiometricsRepositoryMock());
 *   }
 *
 * Then resolve via IoC:
 *   $repo = $this->app->make(BiometricsRepositoryInterface::class);
 */
class evoxtest_BiometricsRepositoryMock implements BiometricsRepositoryInterface
{
    /**
     * Return two stub rows regardless of window or user-collection size.
     * Properties mirror the real checkinout columns the app reads.
     */
    public function get_biometrics(
        string $start_datetime,
        string $end_datetime,
        Collection $user_collection = null
    ) {
        return collect([
            (object)[
                'CheckTime' => $start_datetime,
                'CheckType' => 'I',
                'Userid'    => '2042734',
            ],
            (object)[
                'CheckTime' => $end_datetime,
                'CheckType' => 'O',
                'Userid'    => '2042734',
            ],
        ]);
    }
}

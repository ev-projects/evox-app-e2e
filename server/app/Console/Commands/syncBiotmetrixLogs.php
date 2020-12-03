<?php

namespace App\Console\Commands;
use App\Modules\Payroll\Repositories\BiometricsRepositoryInterface;
use App\Modules\Payroll\Resources\DtrResource;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Exception;
use Illuminate\Http\JsonResponse;

class syncBiotmetrixLogs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync_biometrix_logs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'This command fetch biometrix logs';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(BiometricsRepositoryInterface $biometrics)
    {
        $this->biometrics = $biometrics;
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        try {
            // fetch the Default 30 minutes gap from the current time.
                $start_datetime = Carbon::now()->subMinutes(30)->format('Y-m-d H:i:s');
                $end_datetime = Carbon::now()->format('Y-m-d H:i:s'); 


            $biometrics_collection = $this->biometrics->get_biometrics( $start_datetime, $end_datetime );
            
            $result = DtrResource::collection( $this->dtr->sync_biometrics_to_dtr( $biometrics_collection ) );

            return success_response(
                trans('messages.'.__FUNCTION__.'_success'), 
                $result
            );
        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}

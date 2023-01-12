<?php

namespace App\Console\Commands;

use Exception;

use Carbon\Carbon;

use Illuminate\Console\Command;
use Illuminate\Http\JsonResponse;
use App\Modules\Department\Models\Department;
use App\Modules\Schedule\Models\SchedulePolicy;
use App\Modules\User\Repositories\UserRepositoryInterface;

use App\Modules\Payroll\Repositories\DtrRepositoryInterface;

class simcorpDTR extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'simcorp_dtr_fix';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'simcorp_dtr_fix';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct(DtrRepositoryInterface $dtr, 
                                UserRepositoryInterface $user
                                )
    {
        $this->dtr = $dtr; 
        $this->user = $user;

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

            $deparment = Department::with("users")->find(112);

            // dump($deparment->users);
            // dd($deparment->users->where('id',1767));
            // $user_collection = $deparment->users->where('id',1767);
            // $user_collection = $deparment->users->where('id',1714);
            // $user_collection = $deparment->users->where('id',1691);
            $user_collection = $deparment->users;



            $sched_policy = SchedulePolicy::where("schedule_id", 10012)->get();
            foreach(   $user_collection as $user ){
                $this->dtr->apply_dtr_to_simcorp_dtr( $user, $bypass = true ,  "2022-10-19", "2022-11-15", $sched_policy );
            }
            
            

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }
}

<?php 

namespace App\Modules\Bhr\Repositories;

use App\Modules\Payroll\Models\Biometrics;
use App\Modules\Payroll\Models\Dtr;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\Schedule\Models\Schedule;
use App\Modules\User\Models\User;
use App\Modules\User\Models\UtcTimelog;
use Carbon\Carbon;
use Exception;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BhrRepository implements BhrRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    

    /**
     *  Responsible for Fetching all the changed Users' number from BHr
     * @return array $bhr_user_number_array { inserted && changed }
     */
    public function get_changed_users( $since_date_to_sync ){
        #print_r($since_date_to_sync);
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            //$since_date_to_sync = date('Y-m-d', strtotime($since_date_to_sync)) . 'T00:00:00-00:00';

            // Define the End Point for the API.
            $end_point = 'employees/changed?since=' . urlencode($since_date_to_sync);
            
            $last_changed_collection = collect([]);
            $bhr_employees = ( bhr_api_call('GET', $end_point) )->employees;
            //log_to_file('info', "BHR Emp", [$bhr_employees,  __FUNCTION__], "sync_bhr_user");
            // Iterate the BHr Call Result
            foreach( $bhr_employees as $employee_sub_details ) {
                $last_changed_collection->push(['id' => $employee_sub_details->id, 'lastChanged' => (new Carbon($employee_sub_details->lastChanged, "UTC"))->getTimestamp()]);
            }

            #log_to_file( 'info', 'BHR Response Collection' . __FUNCTION__ , $last_changed_collection->values(), "bhrlog");

            $sorted_last_changed_collection = $last_changed_collection->sortBy('lastChanged');

            #log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            #log_to_file( 'info', 'BHR Sorted Collection ' . __FUNCTION__ , $sorted_last_changed_collection->values(), "bhrlog");

            $bhr_user_number_array = [];

            foreach($sorted_last_changed_collection->values()->all() as $item) {
                $bhr_user_number_array[ $item['id'] ] = $item['id'];
            };
             
            log_to_file( 'info', ('LOG_END') .' '. __FUNCTION__ , $bhr_user_number_array, "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $bhr_user_number_array;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }




    /**
     *  Responsible for Fetching ALL the BHR Users' Number
     * @return Collection $bhr_user_number_collection
     */
    public function get_all_bhr_user_numbers(){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $bhr_user_number_collection = new Collection;

            // Define the End Point for the API.
            $end_point = 'employees/directory';
            
            // Iterate the BHr Call Result
            foreach( bhr_api_call('GET', $end_point)->employees as  $row ) {
                
                # Push the BHR Employee Number on the collection
                $bhr_user_number_collection->push( $row->id );

            }
             
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_user_number_collection, "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $bhr_user_number_collection;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }


    /**
     *  Responsible for Fetching the User's Detail via BHR User number
     * @param string $bhr_user_number
     * @param boolean $for_sync
     * @return Object $bhr_user
     */
    public function get_user( string $bhr_user_number, $for_sync = false ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $fields =  get_imploded_constant( $for_sync  ? 'BHR_USER_SYNC_FIELDS' : 'BHR_USER_FIELDS' );

            # Call the API of BHR to fetch the User's details in BHR
            $bhr_user = bhr_api_call('GET', 'employees/'.$bhr_user_number.'?fields='. $fields   );
                
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_user, "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $bhr_user;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }


    /**
     *  Responsible for Fetching the User's Profile Picture
     * @param string $bhr_user_number
     * @return base64_encoded $profile_picture
     */
    public function get_profile_picture( string $bhr_user_number = null ){

        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $result = null;

            if( is_valid($bhr_user_number) ){

                # Call the API of BHR to fetch the User's Profile Picture
                $profile_picture = bhr_api_call('GET', 'employees/'.$bhr_user_number.'/photo/medium');

                // Parse to base64_encode
                $result = base64_encode($profile_picture);
                    
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");
            } else {
                log_to_file( 'info', 'No Valid BHR Number', [], "bhrlog");
            }

            return $result;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }

    /**
     *  Responsible for Fetching the User's Detail via BHR User number
     * @param string $bhr_user_number
     * @param boolean $for_sync
     * @return Object $bhr_user
     */
    public function get_user_bhr_field( string $bhr_user_number = null, string $user_fields_key = '' ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $result = null;

            if( is_valid($bhr_user_number) ){
                $fields = get_imploded_constant(strlen($user_fields_key) > 0 ? $user_fields_key : 'BHR_USER_PERSONAL' );

                # Call the API of BHR to fetch the User's details in BHR
                $result = bhr_api_call('GET', 'employees/'.$bhr_user_number.'?fields='. $fields   );
                    
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "bhrlog");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");
            } else {
                log_to_file( 'info', 'No Valid BHR Number', [], "bhrlog");
            }

            return $result;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }


    /**
     *  Responsible for Fetching the User's Detail via BHR User number
     * @param string $bhr_user_number
     * @param boolean $for_sync
     * @return Object $bhr_user
     */
    public function get_user_job_information( string $bhr_user_number = null , string $field_name ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $result = null;

            if( is_valid($bhr_user_number) ){
                $result = bhr_api_call('GET', 'employees/'.$bhr_user_number.'/tables/'.$field_name  );
                    
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "bhrlog");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");
            } else {
                log_to_file( 'info', 'No Valid BHR Number', [], "bhrlog");
            }

            return $result;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }

    /**
     *  Responsible for Fetching the User's Detail via BHR User number
     * @param string $bhr_user_number
     * @param boolean $for_sync
     * @return Object $bhr_user
     */
    public function get_report( string $report_id ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $result = [];

            if( is_valid($report_id) ){
                $result = bhr_api_call('GET', 'reports/'.$report_id.'?format=JSON&fd=yes&onlyCurrent=true');
                    
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "bhrlog");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");
            } else {
                log_to_file( 'info', 'No Valid BHR Number', [], "bhrlog");
            }

            return $result;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }


    /**
     *  Responsible for Fetching the User's Leave Credits
     * @param string $bhr_user_number
     * @param string $end_date
     * @return Object $bhr_user
     */
    public function get_leave_credits( string $bhr_user_number, string $end_date ){
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [], "bhrlog");
        try {

            $result = null;

            if( is_valid($bhr_user_number) ){

                $end_date = date('Y-m-d', strtotime($end_date)) . 'T00:00:00-00:00';

                $result = bhr_api_call('GET', 'employees/'.$bhr_user_number.'/time_off/calculator?end='.$end_date  );
                    
                log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $result, "bhrlog");
                log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");
            } else {
                log_to_file( 'info', 'No Valid BHR Number', [], "bhrlog");
            }

            return $result;

        } catch (Exception $e) {
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }

    /**
     *  Responsible for Fetching Holidays from BHr and Syncing it on our Holiday Table. Conducts checking if holiday already exists.
     * @param string $start_date
     * @param string $end_date
     * @return Collection $holiday_collection
     */
    public function sync_holidays( string $start_date, string $end_date )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date], "bhrlog");
        DB::beginTransaction();
        try {

            $holidays_collection = new Collection;

            // Get the Holidays from BHr to be iterated. 
            foreach( $this->get_holidays( $start_date, $end_date ) as $row ) {

                // Checks if the current Holiday in the Iteration is already Pre-defined OR already existing and synced.
                $existing_holiday_query = Holiday::whereRaw("
                                                        ( is_predefined = 1 
                                                            AND DATE_FORMAT(date,'%m-%d') = DATE_FORMAT(?,'%m-%d') )
                                                    OR
                                                        ( is_predefined = 0 
                                                            AND date = ?
                                                            AND name = ?  )
                                                    ", array( 
                                                            $row->start, 
                                                            $row->start, 
                                                            $row->name 
                                                        )
                                                    );

                $existing_holiday = $existing_holiday_query->get();


                $set_country_id = null;
                

                $acronym = null;
                $acronym = $this->get_match("/\[([^\]]*)\]/", $row->name);

                    // $acronym = $match[1];                 
                $check_utc_exist = UtcTimelog::where("alpha_three",$acronym  )->first();
                if($check_utc_exist){
                    $set_country_id = $check_utc_exist-> country_id;
                }
                                                    
                if( $existing_holiday->count() == 0 ) {

                    $holiday                  = new Holiday();
                    $holiday->name            = $row->name;
                    $holiday->type            = ( Str::contains($row->name, '(Regular)') ? 'lh' : 'sh' );
                    $holiday->date            = $row->start;
                    $holiday->country_id      = $set_country_id;
                    $holiday->is_predefined   = false;
                    $holiday->save();

                    $holidays_collection->push( $holiday );

                    log_to_file( 'info', 'Holiday NOT Existing! Inserted to DB.', $holiday->getAttributes(), "bhrlog");

                } else {
                    log_to_file( 'info', 'Holiday Existing!', $existing_holiday, "bhrlog");
                }
            }

            DB::commit();
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");
            // error_log("returning");
          
            return $holidays_collection;

        } catch (Exception $e) {
            DB::rollback();
            error_log($e->getMessage());
            log_error($e);
            log_to_file( 'info', get_constant('LOG_ROLLBACK'), [],  "bhrlog");
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }

    /**
     *  Responsible for Fetching Holdays from BHr.
     * @param string $start_date
     * @param string $end_date
     * @return Collection $bhr_holidays_array
     */
    public function get_holidays( string $start_date, string $end_date  )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date], "bhrlog");
        try {

            $bhr_holidays_array = [];
            
            // Define the End Point for the API.
            $end_point = 'time_off/whos_out/?start='.$start_date.'&end='.$end_date;

            // Iterate the BHr Call Result PHL
            foreach( bhr_api_call('GET', $end_point, $data = array(), $send_as_json = false,) as $row ) {

                // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
                if( $row->type == 'holiday' ) {
                    $bhr_holidays_array[] = $row;
                }
            }
          
            // Iterate the BHr Call Result IND
            foreach( bhr_api_call('GET', $end_point, $data = array(), $send_as_json = false, $country = "India") as $row ) {

                // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
                if( $row->type == 'holiday' ) {
                    $bhr_holidays_array[] = $row;
                }
            }

            // Iterate the BHr Call Result BULGARIA
            foreach( bhr_api_call('GET', $end_point, $data = array(), $send_as_json = false, $country = "Bulgaria") as $row ) {

                // If the current Iteration's Type Attribute is a 'holiday', proceed on checking for possible Holiday transaction.
                if( $row->type == 'holiday' ) {
                    $bhr_holidays_array[] = $row;
                }
            }
            $bhr_holidays_array = array_unique($bhr_holidays_array,SORT_REGULAR);
             usort($bhr_holidays_array, function($a, $b)
            {
                return strtotime($a->start) - strtotime($b->start);
            });
            

            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_holidays_array, "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            return $bhr_holidays_array;

        } catch (Exception $e) {
            DB::rollback();
            
            log_error($e);
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhrlog");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhrlog");

            throw $e;
        }
    }
    
    /**
     *  Responsible for Fetching Leaves from BHr.
     * @param string $start_date
     * @param string $end_date
     * @param User $user (Optional)
     * @return Collection $bhr_leaves_array
     */
    public function get_leaves( string $start_date, string $end_date, User $user = null   )
    {
        log_to_file( 'info', get_constant('LOG_START') . __FUNCTION__ , [ 'start_date' => $start_date, 'end_date' => $end_date, 'user' => $user], "bhr_leaves");
        try {

            $bhr_leaves_array = [];

            // Define the End Point for the API.
            $end_point = 'time_off/requests/?start='.$start_date.'&end='.$end_date;

            // If there is an instance of User, use it's BHr Number as Parameter. 
            if( is_valid($user) ){
                $end_point .= '&employeeId='.$user->bhr_num;
            }
            
            $bhr_leaves_array = bhr_api_call('GET', $end_point);
            
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , $bhr_leaves_array, "bhr_leaves");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhr_leaves");

            return $bhr_leaves_array;

        } catch (Exception $e) {
            DB::rollback();
            
            log_error($e);
            log_to_file( 'info', 'GET LEAVES' . __FUNCTION__ , [$e], "bhr_leaves");
            log_to_file( 'info', get_constant('LOG_END') . __FUNCTION__ , [], "bhr_leaves");
            log_to_file( 'info', get_constant('LOG_GAP'), [], "bhr_leaves");

            throw $e;
        }
    }

    ###############################################################################################
    ##################################### Protected functions #####################################
    ###############################################################################################



    /**
     *  Description
     * @return bool
     */
    protected function test()
    {
        DB::beginTransaction();
        try {
            # Sets the Result as null by default.
            $result = null;

            DB::commit();
            log_to_file('info', 'Success', null);
            return $result;
        } catch (Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    protected function get_match($regex,$content)
    {
        if (preg_match($regex,$content,$matches)) {
            return $matches[1];
        } else {
            return null;
        }
    }


    //....


    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################


    //....



}

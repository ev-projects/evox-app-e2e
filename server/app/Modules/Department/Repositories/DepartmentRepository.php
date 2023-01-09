<?php 

namespace App\Modules\Department\Repositories;

use App\Modules\Department\Models\Department;
use Exception;
use Auth;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DepartmentRepository implements DepartmentRepositoryInterface{
    
    ###############################################################################################
    ###################################### Public functions #######################################
    ###############################################################################################

    public function __construct(){

    }
    /**
     *  Responsible for fetching all the Departments
     * 
     * @return Collection $department_collection
     */
    public function all()
    {
        try {
            $department_collection = Department::orderBy('department_name', 'asc')->get();
            log_to_file('info', 'Success', [$department_collection]);
            return $department_collection;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for fetching the Department with the ID given.
     * @param $id
     * @return Department $department
     */
    public function find($id)
    {
        try {
            $department = Department::find($id);
            log_to_file('info', 'Success', [$department]);
            return $department;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    
    /**
     *  Responsible for Disabling a Department with the ID given.
     * @param $id
     * @return Department $department
     */
    public function destroy_department($id)
    {
        try {

            $user = Auth::user();
            $department = Department::find($id);

            $department->disabled_by = $user->id;

            $department->disabled_on =  date('Y-m-d H:i:s');
            $department->save();
            $department->delete();
            

            log_to_file('info', 'Success', [$department]);
            return true;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }

    /**
     *  Responsible for assigning the Department Handlers
     * @param $id
     * @param array $user_id_array
     * @return boolean
     */
    public function assign_handlers( $id, array $user_id_array )
    {
        try {
            $department = Department::find($id);

            $department->department_supervisors()->sync( $user_id_array );

            log_to_file('info', 'Success', [$department->id . ' - ' . $department->department_name, $user_id_array], 'assign');
            return $department;

        } catch (Exception $e) {
            log_error($e);
            throw $e;
        }
    }


}
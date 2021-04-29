<?php

namespace App\Modules\User\Http\Controllers;

use Illuminate\Http\Request;

use App\Http\Controllers\Controller;
use App\Modules\Bhr\Repositories\BhrRepositoryInterface;
use App\Modules\Email\Repositories\EmailRepositoryInterface;
use App\Modules\Payroll\Repositories\DtrRepositoryInterface;
use App\Modules\Payroll\Resources\DtrResource;
use App\Modules\Schedule\Resources\ScheduleCollection;
use App\Modules\Schedule\Resources\ScheduleResource;
use App\Modules\User\Http\Requests\AssignUserEmployeesRequest;
use App\Modules\User\Http\Requests\AssignUserRolePermissionRequest;
use App\Modules\User\Http\Requests\ChangePasswordRequest;
use App\Modules\User\Http\Requests\ForgotPasswordRequest;
use App\Modules\User\Http\Requests\RegisterUserRequest;
use App\Modules\User\Repositories\UserRepositoryInterface;
use App\Modules\User\Resources\UserListResource;
use App\Modules\User\Resources\UserListResourceCollection;
use App\Modules\User\Resources\UserProfileResource; 
use App\Modules\User\Resources\AnniversaryResources; 
use Carbon\Carbon;
use App\Modules\User\Resources\EmploymentStatusResource; 
use App\Modules\User\Resources\JobInformationResource;   
use App\Modules\User\Resources\HolidayResource;
use Auth;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Modules\Payroll\Models\Holiday;
use App\Modules\User\Http\Requests\UpdateUserProfileRequest;
use App\Modules\User\Models\User;
use App\Modules\User\Repositories\ProfileRepositoryInterface;
use App\Modules\User\Resources\DpaUserListResource;
use App\Modules\User\Resources\DpaUserListResourceCollection;
use App\Modules\User\Resources\LeaveCreditsListResource;
use App\Modules\User\Resources\LeavesListResource;
use App\Modules\User\Resources\PersonalInformationResource;
use App\Modules\User\Resources\RoleResource;
use Illuminate\Database\Eloquent\Collection;

class ProfileController extends Controller
{
    protected $user;
    protected $profile;

    public function __construct(UserRepositoryInterface $user,
                                ProfileRepositoryInterface $profile){
        $this->user = $user;
        $this->profile = $profile;
    }

    /**
     * This function updates the User Profile 
     * @param string $id
     * @return \Illuminate\Http\JsonResponse
     */
    public function update( UpdateUserProfileRequest $request, $id ){
    
        try {
            log_activity( trans('messages.update_user_profile_attempt') );

            
            $this->validate(new Request([
                'id' => $id
            ]), [
                'id' => 'int'
            ]);
               
            $user = $this->user->show( $id );

            return success_response(
                trans('messages.update_user_profile_success'),  
                new UserProfileResource( $this->profile->update( $user, $request ) )
            );

        } catch(Exception $e){
            return error_response( trans('messages.error_default'), $e );
        }
    }



}
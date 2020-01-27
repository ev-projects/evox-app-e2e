<?php

namespace App\Modules\User\Models;

use Illuminate\Notifications\Notifiable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Spatie\Permission\Traits\HasRoles;
use Spatie\Permission\Traits\HasPermissions;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable, HasRoles, HasPermissions;
    
    public $primaryKey = 'emp_num';
    public $incrementing = false;
    // Rest omitted for brevity
    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
    ];

    /**
     * The attributes that should be hidden for arrays.
     *
     * @var array
     */
    protected $hidden = [
        'password'
    ];

    /**
     * The attributes that should be cast to native types.
     *
     * @var array
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
    ];

    # Gets the specific Department of the User
    // public function department(){
    //     return $this->hasOne(Department::class, 'id', 'department_id');
    // }

    

    /**
     * Get the identifier that will be stored in the subject claim of the JWT.
     *
     * @return mixed
     */
    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    /**
     * Return a key value array, containing any custom claims to be added to the JWT.
     *
     * @return array
     */
    public function getJWTCustomClaims()
    {
        return [];
    }
    
    public function managers()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'emp_num', 'supervisor_emp_num');
    }

    public function managees()
    {
        return $this->belongsToMany(User::class, 'users_supervisors', 'supervisor_emp_num', 'emp_num');
    }

    // # Gets the specific Roles of the User
    // public function roles(){
    //     return $this->belongsToMany(Role::class, 'users_roles', 'emp_num', 'role_id',  'emp_num', 'id');
    // }
    // # Gets the specific Roles of the User
    // public function permissions(){
    //     return $this->belongsToMany(Permission::class, 'users_permissions', 'emp_num', 'permission_code',  'emp_num', 'permission_code');
    // }

    

}

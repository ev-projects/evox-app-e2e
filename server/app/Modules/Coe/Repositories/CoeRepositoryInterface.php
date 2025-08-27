<?php 

namespace App\Modules\Coe\Repositories;

use App\Modules\User\Models\User;

interface COERepositoryInterface
{
    public function all();

    public function create(User $user, $coe_bhr_fields, $request, $employee);

    public function find($id);
}
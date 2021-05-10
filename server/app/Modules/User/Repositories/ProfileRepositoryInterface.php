<?php 

namespace App\Modules\User\Repositories;

use App\Modules\User\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

interface ProfileRepositoryInterface
{

    public function store( User $user, Request $request );

    public function update( User $user, Request $request );


}
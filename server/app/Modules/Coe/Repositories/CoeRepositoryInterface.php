<?php 

namespace App\Modules\Coe\Repositories;

interface COERepositoryInterface
{
    public function all();

    public function create($user_id, $purpose_index, $show_compensation, $employee);

    public function find($id);
}
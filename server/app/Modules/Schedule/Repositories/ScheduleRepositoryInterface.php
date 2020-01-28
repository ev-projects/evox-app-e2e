<?php 

namespace App\Modules\Schedule\Repositories;

interface ScheduleRepositoryInterface
{
    public function create(array $data);

    public function update(array $data, $id);

    public function delete($id);

    public function show($id);
}
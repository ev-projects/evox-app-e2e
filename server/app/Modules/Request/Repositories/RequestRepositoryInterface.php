<?php 

namespace App\Modules\Request\Repositories;

interface RequestRepositoryInterface
{
    public function get_status_numbers( array $data );
    public function get_status_numbers_dashboard( array $data );
    public function get_status_numbers_only($user, $cutoff);
  

}
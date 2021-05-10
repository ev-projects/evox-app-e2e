<?php 

namespace App\Modules\Payroll\Repositories;

interface PayrollCutoffRepositoryInterface
{
    public function get_payroll_cutoff( string $date = null );
    
    public function get_filter_for_dtr( $user_id );

    public function all();

    public function find( $id );
    
    public function store( array $data );

    public function update( array $data , $id );

    public function destroy( $id );
}
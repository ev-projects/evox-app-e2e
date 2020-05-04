<?php 


namespace App\Modules\Request;

use Exception;
use Illuminate\Support\Facades\DB;

trait RequestTrait
{

    public function approve()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( is_under_supervisee( $this->user_id ) && $current_status != get_constant('REQUEST_STATUS.approved') ) {

                
                $this->status       = get_constant('REQUEST_STATUS.approved');
                $this->updated_by   = auth()->user()->id;
                $this->save();
                
                DB::commit();
                log_to_file('info', 'Request changed from ['.$current_status.'] to ['. get_constant('REQUEST_STATUS.approved').']', $this->attributes, 'request');
            } else {
                log_to_file('info', 'Request is already ['. get_constant('REQUEST_STATUS.approved').']', $this->attributes, 'request');
            }

            return $this;

        } catch( Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }
    

    public function decline()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( is_under_supervisee( $this->user_id ) && $current_status != get_constant('REQUEST_STATUS.declined') ) {

                
                $this->status       = get_constant('REQUEST_STATUS.declined');
                $this->updated_by   = auth()->user()->id;
                $this->save();
                
                DB::commit();
                log_to_file('info', 'Request changed from ['.$current_status.'] to ['. get_constant('REQUEST_STATUS.declined').']', $this->attributes, 'request');
            } else {
                log_to_file('info', 'Request is already ['. get_constant('REQUEST_STATUS.declined').']', $this->attributes, 'request');
            }

        } catch( Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }
    
    
    public function pending()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( $current_status != get_constant('REQUEST_STATUS.pending') ) {

                
                $this->status       = get_constant('REQUEST_STATUS.pending');
                $this->updated_by   = auth()->user()->id;
                $this->save();
                
                DB::commit();
                log_to_file('info', 'Request changed from ['.$current_status.'] to ['. get_constant('REQUEST_STATUS.pending').']', $this->attributes, 'request');
            } else {
                log_to_file('info', 'Request is already ['. get_constant('REQUEST_STATUS.pending').']', $this->attributes, 'request');
            }

        } catch( Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }

    
    public function cancel()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( get_authenticated_user( $this->user_id ) && $current_status != get_constant('REQUEST_STATUS.canceled') ) {

                
                $this->status       = get_constant('REQUEST_STATUS.canceled');
                $this->updated_by   = auth()->user()->id;
                $this->save();
                
                DB::commit();
                log_to_file('info', 'Request changed from ['.$current_status.'] to ['. get_constant('REQUEST_STATUS.canceled').']', $this->attributes, 'request');
            } else {
                log_to_file('info', 'Request is already ['. get_constant('REQUEST_STATUS.canceled').']', $this->attributes, 'request');
            }

        } catch( Exception $e) {
            DB::rollback();
            log_error($e);
            throw $e;
        }
    }


    public function set_employee_note( $note )
    {
        $this->employee_note = ( isset( $note ) && is_valid( $note ) ) ? $note : null;
    }


    public function set_approver_note( $note )
    {
        $this->approver_note = ( isset( $note ) && is_valid( $note ) ) ? $note : null;
    }

}

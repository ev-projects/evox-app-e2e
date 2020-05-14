<?php 


namespace App\Modules\Request;

use Exception;
use Illuminate\Support\Facades\DB;

trait ApprovalTrait
{

    /** Sets the Instance to Approved Status */
    public function approve()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( is_under_supervisee( $this->user_id ) && !$this->isApproved() ) {

                
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
    

    /** Sets the Instance to Declined Status */
    public function decline()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( is_under_supervisee( $this->user_id ) && !$this->isDeclined() ) {

                
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
    
    /** Sets the Instance to Pending Status */
    public function pending()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( !$this->isPending() ) {

                
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

    /** Sets the Instance to Cancel Status */
    public function cancel()
    {
        DB::beginTransaction();
        try {
            $current_status = $this->status;

            if( get_authenticated_user( $this->user_id ) && !$this->isCanceled() ) {

                
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

    /** Sets the Employee Note. */
    public function set_employee_note( $note )
    {
        $this->employee_note = ( isset( $note ) && is_valid( $note ) ) ? $note : null;
    }

    /** Sets the Approver Note. */
    public function set_approver_note( $note )
    {
        $this->approver_note = ( isset( $note ) && is_valid( $note ) ) ? $note : null;
    }

    
    ########################################################################
    ############################ Custom Helpers ############################
    ########################################################################

    
    /** Checks if the instance is approved. */
    public function isApproved(){
        return ( $this->status == get_constant('REQUEST_STATUS.approved') ) ? true : false;
    }

    /** Checks if the instance is declined. */
    public function isDenied(){
        return ( $this->status == get_constant('REQUEST_STATUS.declined') ) ? true : false;
    }

    /** Checks if the instance is canceled. */
    public function isCanceled(){
        return ( $this->status == get_constant('REQUEST_STATUS.canceled') ) ? true : false;
    }

    /** Checks if the instance is pending. */
    public function isPending(){
        return ( $this->status == get_constant('REQUEST_STATUS.pending') ) ? true : false;
    }

}

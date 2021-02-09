<?php

namespace App\Modules\Payroll\Models;


use App\Modules\User\Models\User;
use App\Modules\Payroll\Models\Dtr;
use Exception;

class DtrSummary
{  
    # Instance of the Summary
    private $summary;
    public $column = array();

    /**
     *  Initialize the Structure of all the Data that would be returned by the Summary.
     */
    function __construct()
    {
       $this->clear_properties();
    }



    ###############################################################################################
    ######################################## Main function ########################################
    ###############################################################################################



    /**
     *  Main function for triggering the Computation of the Summary.
     */
    public function get_summary( $dtr_collection )
    {
        try {

            $this->clear_properties();

            # Iterates the DTR Collection
            foreach ( $dtr_collection as $dtr ) {
                # Get the DTR Type of the Current DTR Instance
                $dtr_type = $dtr->getDtrType();

                # Checks if the DTR has Valid Timelogs and proper Schedule.
                if( $dtr->validLog() && $dtr->hasSchedule() ) {

                    # Gets all the Payroll Items of the current DTR Instance.
                    $payroll_items_collection = $dtr->payroll_items()->get();
                   ;
                    # Group the Payroll Items base on Tagging.
                    $grouped_payroll_items_array = grouped_payroll_items( $payroll_items_collection );

                    # Computes the Late and Undertime on Regular DTR Type only.
                    if( !$this->check_if_holiday( $dtr_type ) ) {
                        $this->summary[ get_constant('DTR_TYPE.regular') ][ get_constant('PAYROLL_ITEMS.late') ]      += $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.regular') ][ get_constant('PAYROLL_ITEMS.late') ];
                        $this->summary[ get_constant('DTR_TYPE.regular') ][ get_constant('PAYROLL_ITEMS.undertime') ] += $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.regular') ][ get_constant('PAYROLL_ITEMS.undertime') ];
                    }

                    $next_dtr       = $dtr->next_dtr()->first();
                    $previous_dtr   = $dtr->previous_dtr()->first();

                    $next_dtr_type  = ( is_valid( $next_dtr ) ) ? $next_dtr->getDtrType() : "reg";;
                    $previous_dtr_type      = ( is_valid( $previous_dtr ) ) ? $previous_dtr->getDtrType() : "reg";;

                    # Add the day type of the column
                    $this->column[ $dtr_type ] =  $dtr_type ;

                    # Rest day tagging scenario
                    if( !$this->check_if_holiday( $next_dtr_type ) &&  $dtr_type == get_constant('DTR_TYPE.rest_day')){
                        $next_dtr_type =  get_constant('DTR_TYPE.rest_day');
                    }

                    if( !$this->check_if_holiday( $previous_dtr_type ) &&  $dtr_type == get_constant('DTR_TYPE.rest_day')){
                        $previous_dtr_type =  get_constant('DTR_TYPE.rest_day');
                    }

                   
                    $this->column[ $next_dtr_type ] =  $next_dtr_type ;
                    $this->column[ $previous_dtr_type ] =  $previous_dtr_type ;

                    foreach ($this->column as $value) {
                        if(!isset($this->summary[ $value ] )  && $value != "reg" ){
                            $this->summary[ $value ] = [
                                get_constant('PAYROLL_ITEMS.rendered_hours')         => 0,
                                get_constant('PAYROLL_ITEMS.night_diff')             => 0,
                                get_constant('PAYROLL_ITEMS.overtime')               => 0,
                                get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0,
                            ];
                        }
                    }

                    # Unset  the regular column
                    unset( $this->column[ "reg" ] );
                    
                    $this->compute_payroll_items_to_summary( $dtr_type, $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.regular') ] );
                    
                    # Get the overlapped payroll items
                    if( count(  $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.overlapped') ]  ) > 0 ) {
                        if( is_valid( $next_dtr ) ) {
                            $this->compute_payroll_items_to_summary( $next_dtr_type, $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.overlapped') ] );
                        }else{
                            $this->compute_payroll_items_to_summary( get_constant('PAYROLL_ITEM_TAGS.regular') , $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.overlapped') ] );
                        }    
                    } 
                    
                    # Get the underlapped payroll items
                    if( count(  $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.underlapped') ]  ) > 0 ) {
                        if( is_valid( $previous_dtr ) ) {
                            $this->compute_payroll_items_to_summary( $previous_dtr_type , $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.underlapped') ] );
                        }else{
                            $this->compute_payroll_items_to_summary( get_constant('PAYROLL_ITEM_TAGS.regular') , $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.underlapped') ] );
                        }                   
                    }
                   
                }elseif( !$dtr->validLog() && $dtr->hasSchedule() && $dtr->leaves()->count() <= 0 && !$this->check_if_holiday( $dtr_type ) ){
                    $this->summary[  get_constant('DTR_TYPE.regular')  ][ get_constant('PAYROLL_ITEMS.unpaid_leave')  ] +=  1;
                }elseif( $dtr->on_leave() )  {
                    $this->summary[  get_constant('DTR_TYPE.regular')  ][ get_constant('PAYROLL_ITEMS.on_leave')  ] +=  $dtr->leaves()->first()->amount;
                }

                
            }

            # Formats the Computed Payroll Items from SECONDS to HOUR.
            foreach( $this->summary as $dtr_type => $payroll_items ){

                foreach( $payroll_items as $payroll_item => $payroll_item_value ) {

                    if($payroll_item!=get_constant('PAYROLL_ITEMS.on_leave') && $payroll_item!=get_constant('PAYROLL_ITEMS.unpaid_leave')){
                        $this->summary[$dtr_type][$payroll_item] = seconds_to_hour($payroll_item_value,true);
                    }
                    
                }
            }

            return $this->summary;

        } catch(Exception $e) {
            dd( $e );
        }
    }



    ###############################################################################################
    #################################### Computation functions ####################################
    ###############################################################################################



    /**
     * 
     *  Computes the Payroll Items base on the Indicated Payroll Items Array parameter.
     *  Applies the logic of the following:
     *      - Gating of computation if the Payroll Item is Late or Undertime
     *      - Deduct the Night Diff. from the Rendered Hours 
     *      - Compute the Payroll Item by default.
     *  
     * @param string $dtr_type
     * @param array $payroll_items_array
     * 
     * @return  void
     * 
     */
    protected function compute_payroll_items_to_summary( $dtr_type, $payroll_items_array ) 
    {
        foreach( $payroll_items_array as $payroll_item => $value ) {

            switch( $payroll_item ){
                case get_constant('PAYROLL_ITEMS.late'): 
                case get_constant('PAYROLL_ITEMS.undertime'):
                    continue 2; 
                    break;

                case get_constant('PAYROLL_ITEMS.rendered_hours'): 
                    $this->summary[ $dtr_type ][ $payroll_item ]  += ($value - $payroll_items_array[ get_constant('PAYROLL_ITEMS.night_diff') ] );
                    break;
                    
                default: 
                    $this->summary[ $dtr_type ][ $payroll_item ]  += $value;
                    break;
            }
        }
    }



    ###############################################################################################
    ##################################### Validation functions ####################################
    ###############################################################################################



    /**
     * 
     *  Check if the DTR is a Holiday
     * @return bool 
     */
    public function check_if_holiday( $dtr_type ) 
    {
        return ( in_array( $dtr_type, get_constant('DTR_TYPE.holiday') ) ) ? true : false;
    }
    


    /**
     * 
     *  Check if the DTR is a Rest Day Work.
     * @return bool 
     */
    public function check_if_rest_day_work( $dtr_type ) 
    {
        return ( $dtr_type == get_constant('DTR_TYPE.rest_day') ) ? true : false;
    }

    /**
     *  Reponsible for clearing out the DTR Summary Properties
     */
    private function clear_properties(){

        $this->summary = [
            get_constant('DTR_TYPE.regular') =>  [
                get_constant('PAYROLL_ITEMS.late')                   => 0,
                get_constant('PAYROLL_ITEMS.undertime')              => 0,
                get_constant('PAYROLL_ITEMS.rendered_hours')         => 0,
                get_constant('PAYROLL_ITEMS.night_diff')             => 0,
                get_constant('PAYROLL_ITEMS.overtime')               => 0,
                get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0,
                get_constant('PAYROLL_ITEMS.on_leave')               => 0,
                get_constant('PAYROLL_ITEMS.unpaid_leave')           => 0,
            ], 
            get_constant('DTR_TYPE.rest_day') =>  [
                get_constant('PAYROLL_ITEMS.rendered_hours')         => 0,
                get_constant('PAYROLL_ITEMS.night_diff')             => 0,
                get_constant('PAYROLL_ITEMS.overtime')               => 0,
                get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0,
            ]
        ];
    }


}

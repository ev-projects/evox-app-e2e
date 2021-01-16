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

                # Checks if the DTR has Valid Timelogs and proper Schedule.
                if( $dtr->hasValidTimelogs() && $dtr->hasSchedule() ) {

                    # Gets all the Payroll Items of the current DTR Instance.
                    $payroll_items_collection = $dtr->payroll_items()->get();
                   ;
                    # Group the Payroll Items base on Tagging.
                    $grouped_payroll_items_array = grouped_payroll_items( $payroll_items_collection );

                    # Get the DTR Type of the Current DTR Instance
                    $dtr_type = $dtr->getDtrType();

                    # Fetches the Previous DTR of the current DTR Instance and also it's DTR Type.
                    $previous_dtr       = $dtr->previous_dtr()->first();
                    $previous_dtr_type  = ( is_valid( $previous_dtr ) ) ? $previous_dtr->getDtrType() : null;;

                    # Fetches the Next DTR of the current DTR Instance and also it's DTR Type.
                    $next_dtr           = $dtr->next_dtr()->first();
                    $next_dtr_type      = ( is_valid( $next_dtr ) ) ? $next_dtr->getDtrType() : null;;

                    # Computes the Late and Undertime on Regular DTR Type only.
                    $this->summary[ get_constant('DTR_TYPE.regular') ][ get_constant('PAYROLL_ITEMS.late') ]      += $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.regular') ][ get_constant('PAYROLL_ITEMS.late') ];
                    $this->summary[ get_constant('DTR_TYPE.regular') ][ get_constant('PAYROLL_ITEMS.undertime') ] += $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.regular') ][ get_constant('PAYROLL_ITEMS.undertime') ];

                    # If the current DTR type is a Holiday, Compute only the REGULAR Payroll Tag from the Payroll Items.
                    if( $this->check_if_holiday( $dtr_type ) ) {

                            if(!isset($this->summary[ $dtr_type ])){
                                $this->summary[ $dtr_type ] = [
                                    get_constant('PAYROLL_ITEMS.rendered_hours')         => 0,
                                    get_constant('PAYROLL_ITEMS.night_diff')             => 0,
                                    get_constant('PAYROLL_ITEMS.overtime')               => 0,
                                    get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0,
                                ];
                            }

                            $this->column[ $dtr_type ] =  $dtr_type ;


                        # Computes the Payroll Items and Adds it to the Summary.
                        $this->compute_payroll_items_to_summary( $dtr_type, $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.regular') ] );
                    
                    # If the current DTR type is a Regular/Rest Day
                    } else {

                        # If the Previous DTR's type is a Holiday, don't compute for the current DTR Payroll Item's UNDERLAPPED Payroll Tag. (It will be fetched separately during it's turn in Iteration)
                        if( $this->check_if_holiday( $previous_dtr_type ) ){
                            unset( $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.underlapped') ] );
                        }

                        # If the Next DTR's type is a Holiday, don't compute for the current DTR Payroll Item's OVERLAPPED Payroll Tag. (It will be fetched separately during it's turn in Iteration)
                        if( $this->check_if_holiday( $next_dtr_type ) ){
                            unset( $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.overlapped') ] );
                        }

                        # Compute for the filtered DTR Payroll Items.
                        foreach( $grouped_payroll_items_array as $payroll_item_tag => $payroll_items_array ){

                            # Computes the Payroll Items and Adds it to the Summary.
                            $this->compute_payroll_items_to_summary( $dtr_type, $payroll_items_array );
                        }
                    }


                    # If the Previous DTR is Valid, Proceed on checking if Valid for computation of Overlapped Payroll Items.
                    if( is_valid( $previous_dtr ) ) {

                        # If the Previous or the Current DTR is a Holiday, fetch thhe Previous DTR's Overlapped Payroll Items and ADD it on the current DTR Type's computation.
                        if( $this->check_if_holiday( $previous_dtr_type ) || 
                            $this->check_if_holiday( $dtr_type ) ) {
                            
                            # Fetch Previous DTR's Overlapped Payroll Items.
                            $payroll_items_collection = $previous_dtr->overlapped_payroll_items()->get();

                            if( count($payroll_items_collection) > 0 ) {
                                
                                # Formatting of the Payroll Items fetched.
                                $grouped_payroll_items_array = grouped_payroll_items( $payroll_items_collection );

                                # Computes the Payroll Items and Adds it to the Summary.
                                $this->compute_payroll_items_to_summary( $dtr_type, $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.overlapped') ] );
                            
                            }
                        }
                    }

                    # If the Next DTR is Valid, Proceed on checking if Valid for computation of Underlapped Payroll Items.
                    if( is_valid( $next_dtr ) ) {

                        # If the Next or the Current DTR is a Holiday, fetch the Next DTR's Underlapped Payroll Items and ADD it on the current DTR Type's computation.
                        if( $this->check_if_holiday( $next_dtr_type ) || 
                            $this->check_if_holiday( $dtr_type ) ) {

                            # Fetch Next DTR's Underlapped Payroll Items.
                            $payroll_items_collection = $next_dtr->underlapped_payroll_items()->get();  
                            
                            if( count($payroll_items_collection) > 0 ) {

                                # Formatting of the Payroll Items fetched.
                                $grouped_payroll_items_array = grouped_payroll_items( $payroll_items_collection );

                                # Computes the Payroll Items and Adds it to the Summary.
                                $this->compute_payroll_items_to_summary( $dtr_type, $grouped_payroll_items_array[ get_constant('PAYROLL_ITEM_TAGS.underlapped') ] );

                            }
                        }
                    }

                }elseif(!$dtr->hasValidTimelogs() && $dtr->hasSchedule() && $dtr->leaves()->count() < 0  ){
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

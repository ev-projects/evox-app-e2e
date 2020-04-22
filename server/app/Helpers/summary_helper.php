<?php

    


if (! function_exists('grouped_payroll_items')) {  

    /**
     * Returns the grouped Payroll Items base on the Tag and Item name.
     * 
     * @return array $grouped_payroll_items
     */
    function grouped_payroll_items( $payroll_items_collection ){
        
        # Set default Data Structure of the Grouped Payroll Items.
        $grouped_payroll_items = [
            get_constant('PAYROLL_ITEM_TAGS.regular') =>  [
                get_constant('PAYROLL_ITEMS.late')                   => 0,
                get_constant('PAYROLL_ITEMS.undertime')              => 0,
                get_constant('PAYROLL_ITEMS.rendered_hours')         => 0,
                get_constant('PAYROLL_ITEMS.night_diff')             => 0,
                get_constant('PAYROLL_ITEMS.overtime')               => 0,
                get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0
            ], 
            get_constant('PAYROLL_ITEM_TAGS.overlapped') =>  [
                get_constant('PAYROLL_ITEMS.rendered_hours')         => 0,
                get_constant('PAYROLL_ITEMS.night_diff')             => 0,
                get_constant('PAYROLL_ITEMS.overtime')               => 0,
                get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0,
            ],
            get_constant('PAYROLL_ITEM_TAGS.underlapped') =>  [
                get_constant('PAYROLL_ITEMS.overtime')               => 0,
                get_constant('PAYROLL_ITEMS.overtime_night_diff')    => 0,
            ]
        ];
        
        # Applies the Data of the Payroll Items to the Grouped Data.
        foreach( $payroll_items_collection as $payroll_item ) {
            $tag = ( $payroll_item->tag == null ) ? get_constant('PAYROLL_ITEM_TAGS.regular') : $payroll_item->tag;
            $grouped_payroll_items[ $tag ][ $payroll_item->item ] = $payroll_item->value;
        }

        return $grouped_payroll_items;
    }

}
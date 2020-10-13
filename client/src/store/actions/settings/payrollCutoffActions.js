import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';

/**
 *  A dedicated repository of Actions for PayrollCutoff
 */


// Add PayrollCutoff
export const addPayrollCutoff = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/payroll/cutoff/",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            // dispatch({
            //     'type'      : 'SET_REDIRECT',
            //     'link'      : global.payroll_cutoff
            // })
            // window.location.reload(false);

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Update PayrollCutoff
export const updatePayrollCutoff = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/payroll/cutoff/" + id,
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            // dispatch({
            //     'type'      : 'SET_REDIRECT',
            //     'link'      : global.payroll_cutoff
            // })
            // window.location.reload(false);
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Delete PayrollCutoff
export const deletePayrollCutoff = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/payroll/cutoff/" + id
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            
            // dispatch({
            //     'type'      : 'SET_REDIRECT',
            //     'link'      : global.payroll_cutoff
            // })
            // window.location.reload(false);
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch PayrollCutoff instance
export const fetchPayrollCutoff = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/payroll/cutoff/" + id
        })
        .then(result => {
            dispatch({
                'type'           : 'FETCH_PAYROLL_CUTOFF_SUCCESS', 
                'payrollCutoff'  : result.data.content
            })
            
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Fetch Payroll Cutoff List
export const fetchPayrollCutoffList = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/payroll/cutoff/all"
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_PAYROLL_CUTOFF_LIST_SUCCESS', 
                'list'      : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear PayrollCutoff Instance
export const clearPayrollCutoffInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_PAYROLL_CUTOFF_INSTANCE'
        })
    }
}
// Clear PayrollCutoff Instance
export const clearPayrollCutoffListInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_PAYROLL_CUTOFF_LIST_INSTANCE'
        })
    }
}





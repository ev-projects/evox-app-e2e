import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Request Approval
 */


// Add PayrollCutoff
export const requestApprovalChangeStatus = ( hashCode, status ) => {
    
    return (dispatch, getState) => {
        console.log( process.env.REACT_APP_API_KEY )
        trackPromise( axios({
            method: "post",
            url: process.env.REACT_APP_API_BASE_URL + "/request/approval/",
            headers: { 
                "Content-Type": "application/json",
                'X-Authorization' : process.env.REACT_APP_API_KEY 
            },
            data: {
                hash_code : hashCode,
                status    : status
            }
        }) )
        .then(result => {

            // Dispatch Login Success
            dispatch({
                'type'       : 'FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE', 
                'instance'   : result.data.content,
            })

        })
        .catch(e => {

            dispatch({
                'type'       : 'FAILED_FETCH_REQUEST_APPROVAL_CHANGED_STATUS_INSTANCE'
            })
            
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





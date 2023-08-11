import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";

export const viewEmployeeDtr = (user_id,from,to) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_DTR_SUCCESS', 
                'list'   : result.data.content
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const viewEmployeePunch= (user_id,from,to) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/dtrpunch/"+user_id+"/"+from+"/"+to,
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_PUNCH_SUCCESS', 
                'list'   : result.data.content
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const getFilterForDtr = (user_id) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/payroll/cutoff/get_filter_for_dtr/"+user_id,
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_DTR_FILTER_SUCCESS', 
                'filter'   : result.data.content
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


// Fetch Request List
export const getUserDtrSummary = ( id , from , to ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/report/dtr_summary/block/"+id+"/" + from +"/" + to,
        })
        .then(result => { 
            
                dispatch({
                    'type'      : 'FETCH_USER_DTR_SUMMARY_SUCCESS', 
                    'dtrSummary'  : {
                        data : result.data.content.summary[0].summary, 
                        column : result.data.content.column,
                        column_names : result.data.content.column_names
                    },
                    'employeeInfo' : result.data.content.summary[0].employee_info,
                    
                })

            
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}




// Set Selected Payroll Cutoff instance
export const setSelectedPayrollCutoff = ( payrollCutoff ) => {
    return (dispatch, getState) => {
        dispatch({
            'type'           : 'SET_SELECTED_PAYROLL_CUTOFF', 
            'payrollCutoff'  : payrollCutoff
        })
    }
}


// Get Dtrs with incomplete timelogs for the current cutoff
export const getIncompleteDtr = ( ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/dtr/incomplete_logs/",
        })
        .then(result => {
            dispatch({
                'type'  : 'FETCH_INCOMPLETE_DTR', 
                'data'  : result
            })
            dispatch({'type': 'RELOAD_END'});
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}
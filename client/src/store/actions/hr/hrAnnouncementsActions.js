import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../redirectActions';

/**
 *  A dedicated repository of Actions for HrAnnouncements
 */


// // Add PayrollCutoff
// export const addPayrollCutoff = ( post_data ) => {
//     return (dispatch, getState) => {
//         API.call({
//             method: "post",
//             url: "/payroll/cutoff/",
//             data: post_data
//         })
//         .then(result => {
//             dispatch( Formatter.alert_success( result, 3000 ));
//         })
//         .catch(e => {
//             dispatch( Formatter.alert_error( e ) ) 
//         });
//     }
// }


// // Update PayrollCutoff
// export const updatePayrollCutoff = ( id, post_data ) => {
//     return (dispatch, getState) => {
//         API.call({
//             method: "post",
//             url: "/payroll/cutoff/" + id,
//             data: post_data
//         })
//         .then(result => {
//             dispatch( Formatter.alert_success( result, 3000 ));
//         })
//         .catch(e => {
//             dispatch( Formatter.alert_error( e ) ) 
//         });
//     }
// }


// // Delete PayrollCutoff
// export const deletePayrollCutoff = ( id ) => {
//     return (dispatch, getState) => {
//         API.call({
//             method: "delete",
//             url: "/payroll/cutoff/" + id
//         })
//         .then(result => {
//             dispatch( Formatter.alert_success( result, 3000 ));
//         })
//         .catch(e => {
//             dispatch( Formatter.alert_error( e ) ) 
//         });
//     }
// }

// // Fetch PayrollCutoff instance
// export const fetchPayrollCutoff = ( id ) => {
//     return (dispatch, getState) => {
//         API.call({
//             method: "get",
//             url: "/payroll/cutoff/" + id
//         })
//         .then(result => {
//             dispatch({
//                 'type'           : 'FETCH_PAYROLL_CUTOFF_SUCCESS', 
//                 'payrollCutoff'  : result.data.content
//             })
            
//         })
//         .catch(e => {
//             dispatch( Formatter.alert_error( e ) ) 
//         });
//     }
// }

// Fetch Announcements
export const fetchHrAnnouncements = () => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/hr/announcements/all"
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_HR_ANNOUNCEMENTS_LIST_SUCCESS', 
                'list'      : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Add Announcements
export const addHrAnnouncements = ( data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/hr/announcements" ,
            data: data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));

            dispatch({
                'type'      : 'SET_REDIRECT',
                'link'      : global.links.dashboard
            })

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}




import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../../actions/redirectActions';
import { fetchRequestList, fetchStatusNumbers } from "../filters/requestListActions";
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions';

/**
 *  A dedicated repository of Actions for Overtime
 */


// Add Overtime Request
export const addOvertime = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/overtime",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result ));
            // dispatch(fetchRequestList({
            //     status:           "pending",
            //     valid_from:       null,
            //     valid_to:         null,
            //     department_id:    null,
            //     name:             null,
            //     page:             1,
            //     checkedList:      [],
            //     isAll:            false,
            //     action:           null,
            //     request_type:     'all',
            //     bulk_action:      null,
            //     url:              'my_team_requests'
            // }));

            // dispatch(fetchStatusNumbers({
            //     status:           "pending",
            //     valid_from:       null,
            //     valid_to:         null,
            //     department_id:    null,
            //     name:             null,
            //     page:             1,
            //     checkedList:      [],
            //     isAll:            false,
            //     action:           null,
            //     request_type:     'all',
            //     bulk_action:      null,
            //     url:              'my_team_requests'
            // }));

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


// Update Overtime Request
export const updateOvertime = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/overtime/" + id,
            data: post_data
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

// Fetch Overtime Request
export const fetchOvertime = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/overtime/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_OVERTIME_SUCCESS', 
                'overtime'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Update Overtime Request
export const updateOvertimeStatus = ( id, post_data, status, user_id, fromdate, todate ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/overtime/"+ status + "/" + id,
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
            dispatch(fetchRequestList({
                status:           "pending",
                valid_from:       fromdate,
                valid_to:         todate,
                department_id:    null,
                name:             null,
                page:             1,
                checkedList:      [],
                isAll:            false,
                action:           null,
                request_type:     'all',
                bulk_action:      null,
                url:              'my_team_requests'
            }));

            dispatch(fetchStatusNumbers({
                status:           "pending",
                valid_from:       fromdate,
                valid_to:         todate,
                department_id:    null,
                name:             null,
                page:             1,
                checkedList:      [],
                isAll:            false,
                action:           null,
                request_type:     'all',
                bulk_action:      null,
                url:              'my_team_requests'
            }));

            dispatch(getMyDtrNotifications(user_id) );
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

// Clear Overtime Instance
export const clearOvertimeInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_OVERTIME_INSTANCE'
        })
    }
}

// Reset Overtime Instance
export const resetOvertimeInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_OVERTIME_INSTANCE'
        })
    }
}








import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../../actions/redirectActions';
import { fetchRequestList, fetchStatusNumbers } from "../filters/requestListActions";
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions';

/**
 *  A dedicated repository of Actions for Alter Log
 */


// Add Alter Log Request
export const addAlterLog = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/alter_log",
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


// Update Alter Log Request
export const updateAlterLog = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/alter_log/" + id,
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


// Update Alter Log Status Request
export const updateAlterLogStatus = ( id, post_data, status, user_id, fromdate, todate ) => {

    
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/alter_log/"+ status + "/" + id,
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



// Fetch Alter Log instance
export const fetchAlterLog = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/alter_log/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_ALTER_LOG_SUCCESS', 
                'alterLog'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear Alter Log Instance
export const clearAlterLogInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_ALTER_LOG_INSTANCE'
        })
    }
}

// Reset Alter Log Instance
export const resetAlterLogInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_ALTER_LOG_INSTANCE'
        })
    }
}


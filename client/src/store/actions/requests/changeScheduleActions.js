import axios from "axios";
import API from "../../../services/API";
import { trackPromise } from "react-promise-tracker";
import Formatter from "../../../services/Formatter";


import { setRedirect, clearRedirect } from '../../actions/redirectActions';
import { fetchRequestList, fetchStatusNumbers } from "../filters/requestListActions";
import { getMyDtrNotifications } from '../../../store/actions/dashboard/dashboardActions';
/**
 *  A dedicated repository of Actions for Change Schedule
 */


// Add Change Schedule Request
export const addChangeSchedule = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/change_schedule",
            data: post_data
        })
        .then(result => {
            dispatch( Formatter.alert_success( result, 3000 ));
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


// Update Change Schedule Request
export const updateChangeSchedule = ( id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/change_schedule/" + id,
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


// Update Change Schedule Status Request
export const updateChangeScheduleStatus = ( id, post_data, status, user_id, fromdate, todate ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/request/change_schedule/"+ status + "/" + id,
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

// Fetch Change Schedule instance
export const fetchChangeSchedule = ( id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "get",
            url: "/request/change_schedule/" + id
        })
        .then(result => {
            dispatch({
                'type'      : 'FETCH_CHANGE_SCHEDULE_SUCCESS', 
                'changeSchedule'  : result.data.content
            })
        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

// Clear Change Schedule Instance
export const clearChangeScheduleInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'CLEAR_CHANGE_SCHEDULE_INSTANCE'
        })
    }
}

// Reset Change Schedule Instance
export const resetChangeScheduleInstance = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'RESET_CHANGE_SCHEDULE_INSTANCE'
        })
    }
}

